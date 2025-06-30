const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AGE_GROUPS = [
  { label: 'UNDER_25', min: 0, max: 24 },
  { label: 'FROM_25_TO_40', min: 25, max: 40 },
  { label: 'FROM_40_TO_60', min: 41, max: 60 },
  { label: 'ABOVE_60', min: 61, max: 200 },
];

function getAgeGroup(age) {
  const group = AGE_GROUPS.find(g => age >= g.min && age <= g.max);
  return group?.label || 'UNDER_25';
}

const occupationMap = {
  'Student': 'Student',
  'Retired': 'Retired',
  'Salaried': 'Salaried',
  'Self-employed': 'Self_Employed',
  'Freelancer': 'Freelancer',
  'Other': 'Other',
};

const cityTierMap = {
  'Tier-1': 'Tier_1',
  'Tier-2': 'Tier_2',
  'Tier-3': 'Tier_3',
};

/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.financialScore
 * @param {object} params.rawData
 * @param {Date} params.periodStart
 * @param {Date} params.periodEnd
 */
async function storeFinancialSnapshot({ userId, financialScore, rawData, periodStart, periodEnd }) {
  const {
    savingsRate = 0,
    debtToIncomeRatio = 0,
    essNonEssRatio = 0,
    highExpenseFlag = false,
    income = 0,
    disposableIncome = 0,
    essentialSpend = 0,
    nonEssentialSpend = 0,
    totalExpenses = 0,
    occupation = 'Other',
    cityTier = 'Tier-3',
    age = 0,
  } = rawData;

  const ageGroup = getAgeGroup(age);
  const mappedOccupation = occupationMap[occupation] || 'Other';
  const mappedCityTier = cityTierMap[cityTier] || 'Tier_3';

  try {
    await prisma.financialScoreSnapshot.create({
      data: {
        userId,
        financialScore,
        savingsRate,
        debtToIncomeRatio,
        essNonEssRatio,
        highExpenseFlag,
        income,
        disposableIncome,
        essentialSpend,
        nonEssentialSpend,
        totalExpenses,
        occupation: mappedOccupation,
        cityTier: mappedCityTier,
        ageGroup,
        periodStart,
        periodEnd,
      },
    });

    console.log(`📦 Snapshot stored for user ${userId} for period ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);
  } catch (err) {
    console.error(`❌ Snapshot failed for user ${userId}:`, err);
  }
}

module.exports = { storeFinancialSnapshot };
