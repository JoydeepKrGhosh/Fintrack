const pool = require("../config/db");

// Create Transactions Table
const createTransactionsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      category_id INT REFERENCES categories(id),
      merchant_id INT REFERENCES merchants(id),
      transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT,
      is_useful BOOLEAN DEFAULT TRUE
    );
  `;
  await pool.query(query);
};

// Insert New Transaction
const addTransaction = async (userId, amount, categoryId, merchantId, description, isUseful) => {
  const query = `
    INSERT INTO transactions (user_id, amount, category_id, merchant_id, description, is_useful)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
  `;
  return (await pool.query(query, [userId, amount, categoryId, merchantId, description, isUseful])).rows[0];
};

// Fetch Transactions by User
const getUserTransactions = async (userId) => {
  return (await pool.query(`SELECT * FROM transactions WHERE user_id = $1;`, [userId])).rows;
};

module.exports = { createTransactionsTable, addTransaction, getUserTransactions };
