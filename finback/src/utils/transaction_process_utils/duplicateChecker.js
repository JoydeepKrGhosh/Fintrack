const { PrismaClient } = require('@prisma/client');
const logger = require('../logger.js');

const prisma = new PrismaClient();


async function checkForDuplicates(userId, amount, merchantRecord, transactionDate, sourceType, logger) {
  try {
    const timeWindowStart = new Date(transactionDate);
    timeWindowStart.setMinutes(timeWindowStart.getMinutes() - 10);

    const tolerance = amount.times(0.005); // ±0.5%

    const duplicate = await prisma.transaction.findFirst({
      where: {
        userId,
        merchantId: merchantRecord.id,
        sourceType, // ✅ Compare same source only (SMS vs Email)
        extractedAmount: {
          gte: amount.minus(tolerance),
          lte: amount.plus(tolerance)
        },
        transactionDate: {
          gte: timeWindowStart,
          lte: transactionDate
        }
      },
      select: { id: true }
    });

    if (duplicate) {
      logger.warn('[TX:pending] 🔁 Duplicate transaction detected', {
        existingId: duplicate.id,
        amount: amount.toString()
      });
      return true;
    }

    logger.debug('[TX:pending] ✅ No duplicate transaction found');
    return false;

  } catch (error) {
    logger.error('[TX:pending] ❌ Duplicate check failed', {
      message: error.message,
      stack: error.stack
    });
    throw new Error('Duplicate check failed');
  }
}


module.exports = {
  checkForDuplicates
};