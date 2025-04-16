const pool = require("../config/db");
const {
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const crypto = require("crypto");
const { categorizeTransaction } = require("../utils/aiClassifier");
const { transactionQueue } = require("../queues/transactionQueue");
require("dotenv").config();

// 🔹 Solana Setup
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// 🔹 Load Solana Wallet Keypair Securely
const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
const payer = Keypair.fromSecretKey(secretKey);

// 🔹 Hash Function
const generateHash = (transactionData) => {
  return crypto.createHash("sha256").update(JSON.stringify(transactionData)).digest("hex");
};

// 🔹 Check for Duplicate Transactions
const isDuplicateTransaction = async (userId, amount, merchantId, transactionDate) => {
  const result = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 AND amount = $2 AND merchant_id = $3 AND transaction_date = $4`,
    [userId, amount, merchantId, transactionDate]
  );
  return result.rows.length > 0;
};

// 🔹 Store Hash on Solana
const storeOnSolana = async (hash) => {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 0,
      })
    );
    transaction.add(Buffer.from(hash, "utf-8")); // Attach metadata

    const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log("Stored Hash on Solana:", signature);
    return signature;
  } catch (error) {
    console.error("Error storing hash on Solana:", error);
    return null;
  }
};

// 🔹 Extracted Transaction API (SMS/Email/Manual)
const extractTransaction = async (req, res) => {
  try {
    const {
      amount,
      merchantName,
      date,
      description = "",
      source = "sms",
      paymentMethod = "UPI",
      isUseful = true,
    } = req.body;

    const userId = req.user.userId;
    const transactionDate = new Date(date);

    if (!amount || !merchantName || !date) {
      return res.status(400).json({ error: "Amount, merchant, and date are required." });
    }

    // 🔹 Resolve merchant_id (insert if new)
    let merchantId;
    const merchantRes = await pool.query(
      `SELECT id FROM merchants WHERE name = $1 LIMIT 1`,
      [merchantName]
    );
    if (merchantRes.rows.length > 0) {
      merchantId = merchantRes.rows[0].id;
    } else {
      const insertMerchant = await pool.query(
        `INSERT INTO merchants (name) VALUES ($1) RETURNING id`,
        [merchantName]
      );
      merchantId = insertMerchant.rows[0].id;
    }

    // 🔹 Categorize (returns category name or ID)
    const categoryName = await categorizeTransaction(merchantName, amount);

    // 🔹 Resolve category_id (insert if new)
    let categoryId;
    const categoryRes = await pool.query(
      `SELECT id FROM categories WHERE name = $1 LIMIT 1`,
      [categoryName]
    );
    if (categoryRes.rows.length > 0) {
      categoryId = categoryRes.rows[0].id;
    } else {
      const insertCategory = await pool.query(
        `INSERT INTO categories (name) VALUES ($1) RETURNING id`,
        [categoryName]
      );
      categoryId = insertCategory.rows[0].id;
    }

    // 🔹 Check for Duplicates
    const duplicate = await isDuplicateTransaction(userId, amount, merchantId, transactionDate);
    if (duplicate) {
      return res.status(409).json({ error: "Duplicate transaction detected." });
    }

    // 🔹 Prepare for queue
    await transactionQueue.add("processTransaction", {
      userId,
      amount,
      categoryId,
      merchantId,
      transactionDate,
      description,
      isUseful,
      isRecurring: false, // Optional: add detection later
      recurringPattern: null,
      paymentMethod,
      source,
    });

    res.status(202).json({ message: "Transaction is being processed." });
  } catch (error) {
    console.error("Error extracting transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 🔹 Background Worker: Store Transaction in DB + Solana
const processTransaction = async (job) => {
  const {
    userId,
    amount,
    categoryId,
    merchantId,
    transactionDate,
    description,
    isUseful,
    isRecurring,
    recurringPattern,
    paymentMethod,
    source,
  } = job.data;

  try {
    const transactionData = {
      userId,
      amount,
      categoryId,
      merchantId,
      transactionDate,
      description,
      isUseful,
      isRecurring,
      recurringPattern,
      paymentMethod,
      source,
    };

    const hash = generateHash(transactionData);
    const solanaSignature = await storeOnSolana(hash);
    if (!solanaSignature) throw new Error("Solana hash store failed");

    await pool.query(
      `INSERT INTO transactions (
        user_id, amount, category_id, merchant_id,
        transaction_date, description, is_useful,
        is_recurring, recurring_pattern, payment_method,
        source, solana_hash
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12
      )`,
      [
        userId,
        amount,
        categoryId,
        merchantId,
        transactionDate,
        description,
        isUseful,
        isRecurring,
        recurringPattern,
        paymentMethod,
        source,
        hash,
      ]
    );

    console.log("Transaction stored successfully.");
  } catch (error) {
    console.error("Error in transaction worker:", error);
  }
};

// 🔹 Register Processor
transactionQueue.process("processTransaction", processTransaction);

module.exports = {
  extractTransaction,
};
