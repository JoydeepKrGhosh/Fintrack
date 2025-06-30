const CATEGORY_TYPE_MAP = {
  // Essentials
  'Groceries': 'ESSENTIAL',
  'Grocery & Gourmet Foods': 'ESSENTIAL',
  'Food Staples': 'ESSENTIAL',
  'Food & Dining': 'ESSENTIAL', // Added for your Zomato transaction
  'Healthcare': 'ESSENTIAL',
  'Utilities': 'ESSENTIAL',
  'Rent': 'ESSENTIAL',
  'Baby Products': 'ESSENTIAL',
  'Education Supplies': 'ESSENTIAL',
  'Transport': 'ESSENTIAL',
  'Fuel': 'ESSENTIAL',

  // Non-essentials
  'Shopping': 'NON_ESSENTIAL',
  'Travel': 'NON_ESSENTIAL',
  'Skin Care': 'NON_ESSENTIAL',
  'Dining': 'NON_ESSENTIAL',
  'Entertainment': 'NON_ESSENTIAL',
  'Luxury Clothing': 'NON_ESSENTIAL',
  'Miscellaneous': 'NON_ESSENTIAL',
  'Uncategorized': 'NON_ESSENTIAL', // Added for your uncategorized transactions

  // Savings
  'SIP': 'SAVINGS',
  'FD': 'SAVINGS',
  'RD': 'SAVINGS',
  'MutualFunds': 'SAVINGS',
  'PPF': 'SAVINGS',

  // Income
  'Salary': 'INCOME',
  'Credit': 'INCOME',
  'Deposit': 'INCOME',

  // Insurance
  'Insurance': 'INSURANCE'
};

function mapCategoryToType(category) {
  if (!category) return 'NON_ESSENTIAL'; // Default instead of undefined
  return CATEGORY_TYPE_MAP[category.trim()] || 'NON_ESSENTIAL'; // Fallback to NON_ESSENTIAL
}

module.exports = { mapCategoryToType };
