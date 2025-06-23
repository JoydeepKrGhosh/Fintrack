const { PrismaClient } = require('@prisma/client');
const logger = require('../logger.js');

const prisma = new PrismaClient();


async function createTransaction(transactionData, logger) {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId: transactionData.userId,
        rawText: transactionData.rawText.slice(0, 1024),
        extractedAmount: transactionData.amount,
        currency: 'INR',
        merchantId: transactionData.merchantId,
        transactionDate: transactionData.transactionDate,
        sourceType: transactionData.sourceType,
        senderInfo: transactionData.senderInfo?.slice(0, 100) || null,
        isProcessed: false
      },
      select: {
        id: true,
        userId: true,
        merchantId: true,
        extractedAmount: true,
        transactionDate: true,
        rawText: true,
        sourceType: true,
        senderInfo: true
      }
    });

    logger.info('Transaction created', { id: transaction.id });

    return {
      transaction,
      creationError: null
    };

  } catch (error) {
    logger.error('Transaction creation failed', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      input: transactionData
    });

    return {
      transaction: null,
      creationError: {
        error: "Failed to create transaction",
        details: error.message,
        code: error.code,
        meta: error.meta
      }
    };
  }
}

module.exports = {
  createTransaction
};