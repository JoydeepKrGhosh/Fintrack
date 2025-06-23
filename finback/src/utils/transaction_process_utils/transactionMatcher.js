// utils/transactionMatcher.js
const { PrismaClient } = require('@prisma/client');
const { differenceInMinutes } = require('date-fns');
const stringSimilarity = require('string-similarity');


const prisma = new PrismaClient();

const FUZZY_AMOUNT_DELTA = 0.01; // Allowable 1% difference in amount matching
const MERCHANT_SIMILARITY_THRESHOLD = 0.8; // 80% similarity threshold for fuzzy matching

async function findPotentialMatch({ userId, merchantId, amount, timestamp, sourceType }) {
  const oppositeSource = sourceType === 'sms' ? 'email' : 'sms';
  const lowerAmount = Number(amount) * (1 - FUZZY_AMOUNT_DELTA);
  const upperAmount = Number(amount) * (1 + FUZZY_AMOUNT_DELTA);

  // Fetch candidate transactions that are still open to match
  const candidates = await prisma.transaction.findMany({
    where: {
      userId,
      sourceType: oppositeSource,
      extractedAmount: {
        gte: lowerAmount,
        lte: upperAmount
      },
      transactionDate: {
        gte: new Date(timestamp.getTime() - 15 * 60 * 1000),
        lte: new Date(timestamp.getTime() + 15 * 60 * 1000)
      },
      metadata: {
        matchStatus: 'PENDING'
      }
    },
    include: {
      merchant: true,
      metadata: true
    }
  });

  for (let candidate of candidates) {
    const similarity = stringSimilarity.compareTwoStrings(
      candidate.merchant.name.toLowerCase(),
      (await prisma.merchant.findUnique({ where: { id: merchantId } })).name.toLowerCase()
    );

    if (similarity >= MERCHANT_SIMILARITY_THRESHOLD) {
      return candidate;
    }
  }

  return null;
}

module.exports = { findPotentialMatch };
