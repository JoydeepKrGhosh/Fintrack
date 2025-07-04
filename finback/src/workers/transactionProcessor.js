const { Worker } = require("bullmq");
const Redis = require("ioredis");
const { storeOnSolana } = require("../utils/solana");
const { generateHash } = require("../utils/hashUtils");
const { PrismaClient, Prisma } = require("@prisma/client");
const { callMLService } = require("../service/mlService");
const logger = require("../utils/logger");
const dayjs = require("dayjs");

const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 5000)
});

const prisma = new PrismaClient({ log: ['error'] });

let isShuttingDown = false;

const worker = new Worker(
  "transactionQueue",
  async (job) => {
    if (isShuttingDown) return;

    console.log('💡 Job received data:', job.data);

    const { transactionId, userId, amount, merchantId, rawText } = job.data;

    if (!merchantId || isNaN(parseInt(merchantId))) {
      throw new Error(`Invalid merchantId: ${merchantId}`);
    }

    const parsedMerchantId = parseInt(merchantId);
    const txLogger = logger.withTransaction(transactionId);
    txLogger.info("🚀 Job received", { transactionId, userId, amount, merchantId, rawText });

    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { merchant: true } // include merchant name if available
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      if (transaction.isProcessed) {
        txLogger.info("⏭️ Transaction already processed, skipping.");
        return;
      }

      // 🧠 ML Categorization
      const merchant = transaction.merchant?.name || "";
      const product = transaction.productName || "";
      const mlText = product ? `${merchant} ${product}` : merchant;

      let predictedCategory = null;
      try {
        predictedCategory = await callMLService(mlText);
        txLogger.info("🧠 Predicted category", { mlText, predictedCategory });
      } catch (mlErr) {
        txLogger.warn("⚠️ ML call failed", { mlText, error: mlErr.message });
      }

      // 🧾 Fetch and update TransactionMetadata
      const metadata = await prisma.transactionMetadata.findUnique({
        where: { transactionId }
      });

      // Update Transaction with predicted category
if (predictedCategory) {
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      category: predictedCategory,
      updatedAt: new Date()
    }
  });
  txLogger.info("📝 Updated transaction with category", { category: predictedCategory });
}

      if (metadata) {
        const isCreditCard = metadata.paymentMode?.toLowerCase().includes("credit");

        const updateMetadata = {
          isDebt: isCreditCard || false,
          interestRate: isCreditCard ? new Prisma.Decimal(2.5) : undefined,
          dueDate: isCreditCard ? dayjs().add(45, 'days').toDate() : undefined,
          updatedAt: new Date()
        };

        await prisma.transactionMetadata.update({
          where: { transactionId },
          data: updateMetadata
        });

        txLogger.info("📝 Updated transaction metadata", updateMetadata);
      }

      // 🔑 Step 1: Generate hash
      txLogger.info("🔑 Generating hash...");
      const hash = generateHash({ userId, amount, merchantId, text: rawText });
      txLogger.info("✅ Hash generated", { hash });

      // 🌐 Step 2: Store on Solana
      txLogger.info("🌐 Storing hash on Solana...");
      const solanaSignature = await storeOnSolana(hash);
      if (!solanaSignature) throw new Error("Solana storage failed");
      txLogger.info("✅ Stored on Solana", { solanaSignature });

      // 🛠️ Step 3: Update transaction in DB
      txLogger.info("📝 Updating transaction in DB...", {
        transactionId,
        merchantId: parsedMerchantId,
        hash
      });

      const updatedTx = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          merchantId: parsedMerchantId,
          solanaTxHash: hash,
          isProcessed: true,
          updatedAt: new Date()
        }
      });

      txLogger.info("✅ Transaction successfully updated", { updatedTx });

    } catch (error) {
      txLogger.error("❌ Processing failed", {
        message: error.message,
        stack: error.stack
      });

      if (error.message.includes("Unknown argument")) {
        await job.moveToFailed(new Error("Permanent failure"), true);
      } else {
        throw error;
      }
    }
  },
  {
    connection: redisConnection,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000
    },
    limiter: { max: 5, duration: 1000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 }
  }
);

// Graceful shutdown
process.on('SIGTERM', async () => {
  isShuttingDown = true;
  await worker.close();
  await prisma.$disconnect();
  await redisConnection.quit();
  process.exit(0);
});

worker.on('error', (err) => {
  logger.error('Worker error', err);
});

worker.on('failed', (job, err) => {
  logger.error(`❗ Job ${job.id} failed`, {
    errMsg: err.message,
    stack: err.stack
  });
});

worker.on('completed', (job) => {
  logger.info(`✅ Job ${job.id} completed`);
});

logger.info("📦 Worker started");

module.exports = { worker };
