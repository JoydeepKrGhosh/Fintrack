const { Queue, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { retryStrategy } = require('../utils/redisHelpers');

// Redis Connection (with retry and TLS support)
const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: retryStrategy(3), // 3 retries with backoff
  ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}), // Enable TLS if required
});

// Queue Configuration
const queueConfig = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }, // 1s, 2s, 4s retry delays
    removeOnComplete: true, // Auto-remove succeeded jobs
    removeOnFail: 1000, // Keep failed jobs for 24h (1000 = max count)
  },
};

// Initialize Queue
const transactionQueue = new Queue('transactionQueue', queueConfig);

// Queue Event Listeners (for monitoring)
const queueEvents = new QueueEvents('transactionQueue', { connection });

queueEvents.on('completed', ({ jobId }) => {
  logger.info(`Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed: ${failedReason}`);
});

// Graceful Shutdown Handler
process.on('SIGTERM', async () => {
  await transactionQueue.close();
  await queueEvents.close();
  await connection.quit();
  logger.info('Transaction queue gracefully shut down');
});

module.exports = {
  transactionQueue,
  addTransactionJob: async (transactionData) => {
    return transactionQueue.add('processTransaction', transactionData, {
      jobId: `tx_${transactionData.transactionId}`, // Prevent duplicates
      priority: transactionData.amount > 10000 ? 1 : 3, // Higher priority for large txns
    });
  },
};
