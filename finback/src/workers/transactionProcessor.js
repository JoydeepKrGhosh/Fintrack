const { Worker } = require("bullmq");
const pool = require("../config/db");
const { storeOnSolana } = require("../utils/solanaUtils");

const connection = new Redis(process.env.REDIS_URL);

const transactionWorker = new Worker(
  "transactionQueue",
  async (job) => {
    const { userId, amount, category, merchant, date, type, source } = job.data;

    try {
      // Generate a hash of transaction data
      const hash = generateHash({ userId, amount, category, merchant, date, type });

      // Store hash on Solana
      const solanaSignature = await storeOnSolana(hash);
      if (!solanaSignature) throw new Error("Failed to store hash on Solana");

      // Insert transaction into PostgreSQL
      await pool.query(
        "INSERT INTO transactions (user_id, amount, category, merchant, date, type, source, solana_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [userId, amount, category, merchant, date, type, source, hash]
      );

      console.log("✅ Transaction processed:", job.id);
    } catch (error) {
      console.error("❌ Error processing transaction:", error);
    }
  },
  { connection }
);

module.exports = { transactionWorker };
