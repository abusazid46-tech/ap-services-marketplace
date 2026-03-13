// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const serviceRoutes = require('./routes/services');
// Import database
const db = require('./config/database');
const bookingRoutes = require('./routes/bookings');

// Import routes
const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://ap-services-xi.vercel.app'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
db.testConnection();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({ 
        message: 'AP Services API is running',
        status: 'online',
        timestamp: new Date().toISOString(),
        frontend: 'https://ap-services-xi.vercel.app'
    });
});

// API Health check
app.get('/api/health', async (req, res) => {
    try {
        const dbResult = await db.query('SELECT NOW() as time');
        res.json({ 
            success: true, 
            message: 'Backend is healthy',
            environment: process.env.NODE_ENV || 'development',
            database: {
                status: 'connected',
                time: dbResult.rows[0].time
            }
        });
    } catch (error) {
        res.json({ 
            success: true, 
            message: 'Backend is healthy',
            database: { status: 'disconnected' }
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 AP SERVICES BACKEND');
    console.log('=================================');
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`✅ Health: http://localhost:${PORT}/api/health`);
    console.log(`✅ Auth: http://localhost:${PORT}/api/auth/register`);
    console.log(`✅ Frontend: https://ap-services-xi.vercel.app`);
    console.log('=================================\n');
});
