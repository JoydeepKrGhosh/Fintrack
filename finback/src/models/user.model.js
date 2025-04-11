const pool = require("../config/db");

// Create Users Table (Run this once)
const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
};

// Insert New User
const registerUser = async (name, email, passwordHash) => {
  const query = `
    INSERT INTO users (name, email, password_hash) 
    VALUES ($1, $2, $3) RETURNING id, name, email;
  `;
  return (await pool.query(query, [name, email, passwordHash])).rows[0];
};

// Get User by Email
const getUserByEmail = async (email) => {
  return (await pool.query(`SELECT * FROM users WHERE email = $1;`, [email])).rows[0];
};

module.exports = { createUsersTable, registerUser, getUserByEmail };
