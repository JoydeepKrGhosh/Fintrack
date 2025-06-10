const prisma = require("../prisma-client");

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
  const existing = await prisma.transaction.findFirst({
    where: {
      userId,
      amount,
      merchantId,
      transactionDate,
    },
  });
  return !!existing;
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

    // 🔹 Resolve merchant
    let merchant = await prisma.merchant.findFirst({ where: { name: merchantName } });
    if (!merchant) {
      merchant = await prisma.merchant.create({ data: { name: merchantName } });
    }

    // 🔹 Categorize
    const categoryName = await categorizeTransaction(merchantName, amount);

    // 🔹 Resolve category
    let category = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!category) {
      category = await prisma.category.create({ data: { name: categoryName } });
    }

    // 🔹 Duplicate check
    const duplicate = await isDuplicateTransaction(userId, amount, merchant.id, transactionDate);
    if (duplicate) {
      return res.status(409).json({ error: "Duplicate transaction detected." });
    }

    // 🔹 Queue background job
    await transactionQueue.add("processTransaction", {
      userId,
      amount,
      categoryId: category.id,
      merchantId: merchant.id,
      transactionDate,
      description,
      isUseful,
      isRecurring: false,
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

    await prisma.transaction.create({
      data: {
        ...transactionData,
        solanaHash: hash,
      },
    });

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
