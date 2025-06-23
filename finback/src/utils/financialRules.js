// utils/financialRules.js

const calculateCityTierMultiplier = (cityTier) => {
  const multipliers = {
    'Tier-1': 1.3,
    'Tier-2': 1.1,
    'Tier-3': 1.0,
  };
  return multipliers[cityTier] || 1.0;
};

const getOccupationModifier = (occupation) => {
  const modifiers = {
    Student: 15,
    Retired: 10,
    Self_Employed: 5,
  };
  return modifiers[occupation] || 0;
};

module.exports = { calculateCityTierMultiplier, getOccupationModifier };
