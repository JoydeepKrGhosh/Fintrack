const pool = require("../config/db");

// Create Merchants Table
const createMerchantsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS merchants (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    );
  `;
  await pool.query(query);
};

// Insert Merchants (Run once)
const insertMerchants = async () => {
  const merchants = ["Amazon", "Blinkit", "Zomato", "Swiggy", "Flipkart", "Paytm", "Google Pay"];
  for (let name of merchants) {
    await pool.query(`INSERT INTO merchants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`, [name]);
  }
};

module.exports = { createMerchantsTable, insertMerchants };
