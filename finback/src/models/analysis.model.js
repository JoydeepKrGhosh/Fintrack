const pool = require("../config/db");

// Create AI Analysis Table
const createAIAnalysisTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS ai_analysis (
      id SERIAL PRIMARY KEY,
      transaction_id INT REFERENCES transactions(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      analysis_text TEXT,
      useful BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
};

// Insert AI Analysis Data
const addAIAnalysis = async (transactionId, userId, analysisText, useful) => {
  const query = `
    INSERT INTO ai_analysis (transaction_id, user_id, analysis_text, useful)
    VALUES ($1, $2, $3, $4) RETURNING *;
  `;
  return (await pool.query(query, [transactionId, userId, analysisText, useful])).rows[0];
};

module.exports = { createAIAnalysisTable, addAIAnalysis };
