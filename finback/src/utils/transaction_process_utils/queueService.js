const { transactionQueue, addTransactionJob  } = require('../../queues/transactionQueue.js'); // adjust the path as needed



async function queueTransactionProcessing(transaction, logger) {
  try {
    logger.debug('Queueing transaction job', {
      transactionId: transaction.id,
      merchantId: transaction.merchantId,
      userId: transaction.userId,
      amount: transaction.extractedAmount.toString()
    });

    await addTransactionJob({
      transactionId: transaction.id,
      rawText: transaction.rawText,
      merchantId: transaction.merchantId,
      userId: transaction.userId,
      sourceType: transaction.sourceType,
      senderInfo: transaction.senderInfo,
      amount: transaction.extractedAmount.toString()
    });

    logger.info('Transaction queued');
  } catch (error) {
    logger.error('Queueing failed', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}
async function retryMatchLater(transaction, logger) {
  try {
    logger.debug('🔁 Scheduling retry for transaction', {
      transactionId: transaction.id,
      merchantId: transaction.merchantId,
      userId: transaction.userId
    });

    await transactionQueue.add('retry_match', {
      transactionId: transaction.id,
      rawText: transaction.rawText,
      merchantId: transaction.merchantId,
      userId: transaction.userId,
      sourceType: transaction.sourceType,
      senderInfo: transaction.senderInfo,
      amount: transaction.extractedAmount.toString()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000
      },
      removeOnComplete: true,
      removeOnFail: false
    });

    logger.info('🔄 Retry job scheduled successfully');
  } catch (error) {
    logger.error('❌ Failed to schedule retry job', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}




module.exports = {
  queueTransactionProcessing,
  retryMatchLater
};