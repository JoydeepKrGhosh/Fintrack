const pool = require("../config/db");

// Create Categories Table
const createCategoriesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL
    );
  `;
  await pool.query(query);
};

// Insert Categories (Run once)
const insertCategories = async () => {
  const categories = ["Grocery", "Education", "Travel", "Entertainment", "Bills", "Health", "Shopping"];
  for (let name of categories) {
    await pool.query(`INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`, [name]);
  }
};

module.exports = { createCategoriesTable, insertCategories };
