require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // From .env file
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

module.exports = pool;
