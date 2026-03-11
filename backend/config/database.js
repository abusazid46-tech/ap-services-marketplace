// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase
    }
});

// Test database connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ PostgreSQL connected successfully');
        console.log('📊 Database:', process.env.DB_NAME || 'Supabase DB');
        
        // Test query
        const result = await client.query('SELECT NOW() as current_time');
        console.log('🕒 Server time:', result.rows[0].current_time);
        
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        return false;
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    testConnection
};
