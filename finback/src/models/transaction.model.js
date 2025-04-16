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
      is_useful BOOLEAN DEFAULT TRUE,
      is_recurring BOOLEAN DEFAULT FALSE,
      recurring_pattern VARCHAR(50),
      payment_method VARCHAR(50) DEFAULT 'UPI',
      source VARCHAR(20) DEFAULT 'manual',
      solana_hash TEXT
    );
  `;
  await pool.query(query);
};

const addTransaction = async (
  userId,
  amount,
  categoryId,
  merchantId,
  description,
  isUseful = true,
  isRecurring = false,
  recurringPattern = null,
  paymentMethod = 'UPI',
  source = 'manual',
  transactionDate = new Date(),
  solanaHash = null // ✅ New field
) => {
  const query = `
    INSERT INTO transactions (
      user_id,
      amount,
      category_id,
      merchant_id,
      description,
      is_useful,
      is_recurring,
      recurring_pattern,
      payment_method,
      source,
      transaction_date,
      solana_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;

  const values = [
    userId,
    amount,
    categoryId,
    merchantId,
    description,
    isUseful,
    isRecurring,
    recurringPattern,
    paymentMethod,
    source,
    transactionDate,
    solanaHash // ✅ Include in values
  ];

  return (await pool.query(query, values)).rows[0];
};

// Fetch All Transactions for a User
const getUserTransactions = async (userId) => {
  const query = `
    SELECT 
      t.*, 
      c.name AS category_name, 
      m.name AS merchant_name 
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN merchants m ON t.merchant_id = m.id
    WHERE t.user_id = $1
    ORDER BY t.transaction_date DESC;
  `;
  return (await pool.query(query, [userId])).rows;
};

module.exports = {
  createTransactionsTable,
  addTransaction,
  getUserTransactions,
};
