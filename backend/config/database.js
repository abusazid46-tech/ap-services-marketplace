const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 5000
});

const testConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected");
    console.log("Time:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("❌ DB error:", error);
    return false;
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  testConnection
};
