const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  family: 4   // 👈 force IPv4 instead of IPv6
});

const testConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected");
    console.log("🕒 Database time:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("❌ DB error:", error);
    return false;
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection
};
