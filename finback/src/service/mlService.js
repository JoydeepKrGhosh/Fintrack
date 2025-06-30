// utils/mlService.js
const axios = require('axios');

const categoryMap = {
  // Food & Dining
  swiggy: "Food & Dining",
  zomato: "Food & Dining",
  dominos: "Food & Dining",
  pizzahut: "Food & Dining",
  
  // Shopping
  amazon: "Shopping",
  flipkart: "Shopping",
  nykaa: "Shopping",
  tatacliq: "Shopping",
  
  // Transport
  ola: "Transport",
  uber: "Transport",
  rapido: "Transport",
  indriver: "Transport",
  
  // Utilities
  airtel: "Utilities",
  jio: "Utilities",
  bsnl: "Utilities",
  tatapower: "Utilities",
  
  // Groceries
  bigbasket: "Groceries",
  blinkit: "Groceries",
  dmart: "Groceries",
  spencers: "Groceries",
  
  // Travel
  makemytrip: "Travel",
  goibibo: "Travel",
  easemytrip: "Travel",
  irctc: "Travel",
  
  // Clothing
  myntra: "Clothing",
  ajio: "Clothing",
  hm: "Clothing",
  zara: "Clothing",
  
  // Healthcare
  apollo: "Healthcare",
  pharmeasy: "Healthcare",
  netmeds: "Healthcare",
  practo: "Healthcare",
  
  // Fuel
  iocl: "Fuel",
  hpcl: "Fuel",
  bpcl: "Fuel",
  shell: "Fuel",
  
  // Insurance
  lic: "Insurance",
  bajajallianz: "Insurance",
  hdfcergo: "Insurance",
  icicipru: "Insurance",
  
  // Investments
  zerodha: "Investments",
  groww: "Investments",
  upstox: "Investments",
  kuvera: "Investments",
  
  // Rent
  nobroker: "Rent",
  housing: "Rent",
  magicbricks: "Rent",
  nestaway: "Rent",
  
  // Education
  byjus: "Education",
  unacademy: "Education",
  upgrad: "Education",
  coursera: "Education",
};

/**
 * Returns a category by calling an ML service or using fallback mapping.
 * @param {string} text - Combined merchant and product name
 * @returns {Promise<string>} - Category name
 */
async function callMLService(text) {
  const mlURL = process.env.ML_SERVICE_URL;

  if (mlURL) {
    try {
      const res = await axios.post(mlURL, { text });
      return res.data?.category || "Uncategorized";
    } catch (e) {
      console.warn("ML service failed, using fallback map:", e.message);
    }
  }

  const key = text.toLowerCase();
  for (let k in categoryMap) {
    if (key.includes(k)) {
      return categoryMap[k];
    }
  }

  return "Uncategorized";
}

module.exports = { callMLService };
