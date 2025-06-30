const { PrismaClient } = require('@prisma/client');
const { mapCategoryToType } = require('./categoryMapping.js');
const prisma = new PrismaClient();
const logger = require('../../utils/logger.js');

let limit;

async function setupPLimit() {
  const pLimitModule = await import('p-limit');
  limit = pLimitModule.default(5);
}

/**
 * @typedef {Object} RawFinancialData
 * @property {number} income
 * @property {number} disposableIncome
 * @property {number} loanRepayment
 * @property {number} insurance
 * @property {number} rent
 * @property {number} savings
 * @property {number} essentialSpend
 * @property {number} nonEssentialSpend
 * @property {number} totalExpenses
 * @property {number} savingsRate
 * @property {number} debtToIncomeRatio
 * @property {number} essNonEssRatio
 * @property {string} occupation
 * @property {string} cityTier
 * @property {number} age
 */

async function getAllUsersFinancialData(periodStart, periodEnd) {
  if (!limit) {
    await setupPLimit();
  }

  logger.debug('Fetching users and transactions...', { periodStart, periodEnd });

  try {
    logger.debug('Starting users fetch...');
    const users = await prisma.user.findMany({
      select: { id: true, age: true, occupation: true, cityTier: true },
    });
    logger.debug(`Fetched ${users.length} users`);

    logger.debug('Starting transactions fetch...');
    const allTransactions = await prisma.transaction.findMany({
      where: {
        transactionDate: { gte: periodStart, lte: periodEnd },
        isProcessed: true,
      },
      include: {
        metadata: true,
      },
    });
    logger.debug(`Fetched ${allTransactions.length} transactions`);

    if (allTransactions.length === 0) {
      logger.warning('No transactions found for the given period', {
        periodStart,
        periodEnd,
      });
    }

    const transactionsByUser = allTransactions.reduce((acc, txn) => {
      if (!acc[txn.userId]) acc[txn.userId] = [];
      acc[txn.userId].push(txn);
      return acc;
    }, {});

    const tasks = users.map((user) =>
      limit(async () => {
        const transactionLogger = logger.withTransaction(`USER-${user.id}`);
        const transactions = transactionsByUser[user.id] || [];

        transactionLogger.debug(`Processing ${transactions.length} transactions for user`);

        let income = 0;
        let essentialSpend = 0;
        let nonEssentialSpend = 0;
        let savings = 0;
        let loanRepayment = 0;
        let insurance = 0;
        let rent = 0;

        for (const [index, txn] of transactions.entries()) {
          try {
            const amount =
              typeof txn.extractedAmount === 'object'
                ? parseFloat(txn.extractedAmount.toString())
                : parseFloat(txn.extractedAmount);

            if (isNaN(amount)) {
              transactionLogger.warning('Invalid transaction amount', {
                transactionId: txn.id,
                amount: txn.extractedAmount,
              });
              continue;
            }

            const type = mapCategoryToType(txn.category);
            transactionLogger.debug(`Processing transaction ${index + 1}/${transactions.length}`, {
              amount,
              category: txn.category,
              mappedType: type,
            });

            if (txn.metadata?.isDebt) {
              loanRepayment += amount;
            } else if (type === 'INCOME') {
              income += amount;
            } else if (type === 'ESSENTIAL') {
              essentialSpend += amount;
            } else if (type === 'NON_ESSENTIAL') {
              nonEssentialSpend += amount;
            } else if (type === 'SAVINGS') {
              savings += amount;
            } else if (type === 'INSURANCE') {
              insurance += amount;
            }

            if (txn.category && txn.category.toLowerCase() === 'rent') {
              rent += amount;
            }
          } catch (error) {
            transactionLogger.error('Error processing transaction', {
              transactionId: txn.id,
              error: error.message,
            });
          }
        }

        const totalExpenses =
          essentialSpend + nonEssentialSpend + loanRepayment + insurance + rent;
        const disposableIncome = income - totalExpenses;

        // Derived ratios
        const savingsRate = income > 0 ? savings / income : 0;
        const debtToIncomeRatio = income > 0 ? loanRepayment / income : 0;
        const essNonEssRatio = nonEssentialSpend > 0 ? essentialSpend / nonEssentialSpend : 0;

        /** @type {RawFinancialData} */
        const rawData = {
          income,
          disposableIncome,
          loanRepayment,
          insurance,
          rent,
          savings,
          essentialSpend,
          nonEssentialSpend,
          totalExpenses,
          age: user.age,
          occupation: user.occupation,
          cityTier: user.cityTier,
          savingsRate,
          debtToIncomeRatio,
          essNonEssRatio,
        };

        if (
          Object.values(rawData)
            .filter((v) => typeof v === 'number')
            .every((v) => v === 0)
        ) {
          transactionLogger.error('All financial values are zero!', {
            transactionCount: transactions.length,
            sampleCategories: transactions.slice(0, 3).map((t) => t.category),
          });
        }

        return { userId: user.id, rawData };
      })
    );

    const results = await Promise.all(tasks);
    logger.info('Completed processing all users', {
      userCount: results.length,
      transactionCount: allTransactions.length,
    });
    return results;
  } catch (error) {
    logger.error('Failed to get financial data', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { getAllUsersFinancialData };
