const { Queue } = require("bullmq");
const Redis = require("ioredis");

const connection = new Redis(process.env.REDIS_URL);
const transactionQueue = new Queue("transactionQueue", { connection });

module.exports = { transactionQueue };
