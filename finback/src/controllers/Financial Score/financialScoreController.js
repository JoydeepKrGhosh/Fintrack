const { calculateCityTierMultiplier, getOccupationModifier } = require('../utils/financialRules');

// Constants for scoring rules
const SCORE_CONFIG = {
  BASE: 65,
  SAVINGS: {
    HIGH: 12,
    MEDIUM: 8,
    STUDENT_HIGH: 10,
    STUDENT_LOW: 5,
  },
  DEBT: {
    LOW_AGE: 8,
    ZERO: 10,
    LOW: 6,
  },
  SPENDING_RATIO: {
    RETIRED: 6,
    DEFAULT: 8,
  },
  EXPENSE_PENALTY: -8,
};

const calculateFinancialScore = (userData) => {
  const {
    income = 0,
    disposableIncome = 0,
    loanRepayment = 0,
    insurance = 0,
    age = 0,
    occupation = '',
    cityTier = 'Tier-3',
    groceries = 0,
    utilities = 0,
    healthcare = 0,
    transport = 0,
    education = 0,
    eatingOut = 0,
    entertainment = 0,
    miscellaneous = 0,
    rent = 0,
  } = userData;

  if (income <= 0) {
    return {
      score: 0,
      explanation: ['Income is zero or negative, financial score cannot be computed'],
    };
  }

  const explanation = [];

  const savingsRate = Math.min(disposableIncome / (income + 1), 1.0);
  const debtToIncome = (loanRepayment + insurance) / (income + 1);

  const essentialSpend = groceries + utilities + healthcare + transport + education;
  const nonEssentialSpend = eatingOut + entertainment + miscellaneous;
  const essNonEssRatio = essentialSpend / (nonEssentialSpend + 1);

  const costAdjustedIncome = income / calculateCityTierMultiplier(cityTier);
  const totalExpenses = essentialSpend + nonEssentialSpend + rent + loanRepayment + insurance;
  const highExpenseFlag = totalExpenses / costAdjustedIncome > 0.8;

  let score = SCORE_CONFIG.BASE;
  explanation.push(`Base score: ${score}`);

  // Occupation modifier
  const occupationModifier = getOccupationModifier(occupation);
  score += occupationModifier;
  explanation.push(`Occupation modifier (${occupation}): +${occupationModifier}`);

  // Savings rate scoring
  if (occupation === 'Student') {
    if (savingsRate > 0.1) {
      score += SCORE_CONFIG.SAVINGS.STUDENT_HIGH;
      explanation.push(`High savings rate as student: +${SCORE_CONFIG.SAVINGS.STUDENT_HIGH}`);
    } else if (savingsRate > 0.05) {
      score += SCORE_CONFIG.SAVINGS.STUDENT_LOW;
      explanation.push(`Moderate savings rate as student: +${SCORE_CONFIG.SAVINGS.STUDENT_LOW}`);
    }
  } else {
    if (savingsRate > 0.25) {
      score += SCORE_CONFIG.SAVINGS.HIGH;
      explanation.push(`Excellent savings rate: +${SCORE_CONFIG.SAVINGS.HIGH}`);
    } else if (savingsRate > 0.15) {
      score += SCORE_CONFIG.SAVINGS.MEDIUM;
      explanation.push(`Good savings rate: +${SCORE_CONFIG.SAVINGS.MEDIUM}`);
    }
  }

  // Debt-to-income scoring
  if (age < 25) {
    if (debtToIncome < 0.3) {
      score += SCORE_CONFIG.DEBT.LOW_AGE;
      explanation.push(`Low debt-to-income ratio (young): +${SCORE_CONFIG.DEBT.LOW_AGE}`);
    }
  } else {
    if (debtToIncome === 0) {
      score += SCORE_CONFIG.DEBT.ZERO;
      explanation.push(`No debt: +${SCORE_CONFIG.DEBT.ZERO}`);
    } else if (debtToIncome < 0.2) {
      score += SCORE_CONFIG.DEBT.LOW;
      explanation.push(`Low debt-to-income ratio: +${SCORE_CONFIG.DEBT.LOW}`);
    }
  }

  // Essential/non-essential spend ratio
  if (occupation === 'Retired') {
    if (essNonEssRatio > 1.0) {
      score += SCORE_CONFIG.SPENDING_RATIO.RETIRED;
      explanation.push(`Reasonable essential/non-essential spend (Retired): +${SCORE_CONFIG.SPENDING_RATIO.RETIRED}`);
    }
  } else {
    if (essNonEssRatio > 1.5) {
      score += SCORE_CONFIG.SPENDING_RATIO.DEFAULT;
      explanation.push(`Strong essential spending discipline: +${SCORE_CONFIG.SPENDING_RATIO.DEFAULT}`);
    }
  }

  // High expense pressure
  if (highExpenseFlag) {
    score += SCORE_CONFIG.EXPENSE_PENALTY;
    explanation.push(`High total expenses relative to income: ${SCORE_CONFIG.EXPENSE_PENALTY}`);
  }

  return {
    score: Math.max(0, Math.min(Math.round(score), 100)),
    explanation,
  };
};

// Express route handler
const generateFinancialScore = (req, res) => {
  try {
    const userData = req.body;

    if (!userData?.income || !userData?.age) {
      return res.status(400).json({ error: 'Missing required fields: income and age' });
    }

    const { score, explanation } = calculateFinancialScore(userData);

    res.json({
      financialScore: score,
      breakdown: {
        date: new Date().toISOString(),
        version: '1.1-refactored',
        explanation,
        parametersUsed: [
          'income', 'disposableIncome', 'loanRepayment', 'insurance',
          'age', 'occupation', 'cityTier', 'groceries', 'utilities',
          'healthcare', 'transport', 'education', 'eatingOut',
          'entertainment', 'miscellaneous', 'rent'
        ],
      },
    });
  } catch (err) {
    console.error('Score calculation failed:', err);
    res.status(500).json({ error: 'Internal scoring error' });
  }
};

module.exports = { generateFinancialScore };
