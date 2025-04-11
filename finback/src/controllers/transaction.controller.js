const pool = require("../config/db");
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } = require("@solana/web3.js");
const crypto = require("crypto");
const { categorizeTransaction } = require("../utils/aiClassifier");
const { transactionQueue } = require("../config/queue");
require("dotenv").config();

// 🔹 Solana Setup
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// 🔹 Load Solana Wallet Keypair Securely
const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
const payer = Keypair.fromSecretKey(secretKey);

// 🔹 Hash function for transactions
const generateHash = (transactionData) => {
  return crypto.createHash("sha256").update(JSON.stringify(transactionData)).digest("hex");
};

// 🔹 Check for Duplicate Transactions
const isDuplicateTransaction = async (userId, amount, merchant, date) => {
  const result = await pool.query(
    "SELECT * FROM transactions WHERE user_id = $1 AND amount = $2 AND merchant = $3 AND date = $4",
    [userId, amount, merchant, date]
  );
  return result.rows.length > 0;
};

// 🔹 Store Hash on Solana (Using Memo Program)
const storeOnSolana = async (hash) => {
  try {
    const recipient = payer.publicKey;
    const lamports = 0; // No SOL transfer, just metadata storage

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: lamports,
      })
    );

    transaction.add(Buffer.from(hash, "utf-8")); // Attach hash

    const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log("Stored Hash on Solana:", signature);
    return signature;
  } catch (error) {
    console.error("Error storing hash on Solana:", error);
    return null;
  }
};

// 🔹 Extracted Transaction API (SMS, Email, Notifications)
const extractTransaction = async (req, res) => {
  try {
    const { amount, merchant, date, type, source } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!amount || !merchant || !date || !type || !source) {
      return res.status(400).json({ error: "All transaction fields are required." });
    }

    // 🔹 Check for Duplicates
    if (await isDuplicateTransaction(userId, amount, merchant, date)) {
      return res.status(409).json({ error: "Duplicate transaction detected." });
    }

    // 🔹 Categorize Transaction Using AI Model
    const category = await categorizeTransaction(merchant, amount);

    // 🔹 Add Transaction to Processing Queue (for Background Processing)
    await transactionQueue.add("processTransaction", {
      userId,
      amount,
      category,
      merchant,
      date,
      type,
      source,
    });

    res.status(202).json({ message: "Transaction is being processed." });
  } catch (error) {
    console.error("Error extracting transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 🔹 Process Transaction in Queue
const processTransaction = async (job) => {
  const { userId, amount, category, merchant, date, type, source } = job.data;

  try {
    const transactionData = { userId, amount, category, merchant, date, type, source };
    const hash = generateHash(transactionData);

    // 🔹 Store hash on Solana
    const solanaSignature = await storeOnSolana(hash);
    if (!solanaSignature) throw new Error("Failed to store hash on Solana");

    // 🔹 Insert into PostgreSQL
    await pool.query(
      "INSERT INTO transactions (user_id, amount, category, merchant, date, type, source, solana_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [userId, amount, category, merchant, date, type, source, hash]
    );

    console.log("Transaction successfully stored.");
  } catch (error) {
    console.error("Error processing transaction:", error);
  }
};

// 🔹 Register Queue Processor
transactionQueue.process("processTransaction", processTransaction);

module.exports = { extractTransaction };
