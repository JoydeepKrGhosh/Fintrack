const { Worker } = require("bullmq");
const Redis = require("ioredis");
const { storeOnSolana } = require("../utils/solana.js");
const { generateHash } = require("../utils/hashUtils");
const { addTransaction } = require("../models/transaction.model");

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

connection.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

const transactionWorker = new Worker(
  "transactionQueue",
  async (job) => {
    const {
      userId,
      amount,
      categoryId,
      merchantId,
      description,
      isUseful = true,
      isRecurring = false,
      recurringPattern = null,
      paymentMethod = "UPI",
      source = "manual",
      transactionDate = new Date(),
    } = job.data;

    try {
      const hash = generateHash({ userId, amount, categoryId, merchantId, description });

      console.log("🧾 Storing on Solana...");
      const solanaSignature = await storeOnSolana(hash);
      if (!solanaSignature) throw new Error("Failed to store hash on Solana");

      await addTransaction(
        userId,
        amount,
        categoryId,
        merchantId,
        description,
        isUseful,
        isRecurring,
        recurringPattern,
        paymentMethod,
        source,
        transactionDate,
        hash // make sure `addTransaction` accepts and stores this
      );

      console.log("✅ Transaction processed:", job.id);
    } catch (error) {
      console.error("❌ Error processing transaction:", error);
    }
  },
  { connection }
);

console.log("🚀 Transaction worker started");

module.exports = { transactionWorker };
