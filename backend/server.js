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
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');

// Import routes
const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const serviceRoutes = require('./routes/services');
const app = express();
const PORT = process.env.PORT || 5000;

// ==================== FIXED CORS CONFIGURATION ====================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://ap-services-xi.vercel.app',
    'https://ap-services-marketplace.vercel.app', // YOUR ACTUAL FRONTEND URL
    'https://ap-services-marketplace.onrender.com' // Your backend itself
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
db.testConnection();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({ 
        message: 'AP Services API is running',
        status: 'online',
        timestamp: new Date().toISOString(),
        frontend: 'https://ap-services-marketplace.vercel.app' // Updated
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

// ==================== ERROR HANDLING MIDDLEWARE ====================
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 AP SERVICES BACKEND');
    console.log('=================================');
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`✅ Health: http://localhost:${PORT}/api/health`);
    console.log(`✅ Auth: http://localhost:${PORT}/api/auth/register`);
    console.log(`✅ Frontend: https://ap-services-marketplace.vercel.app`);
    console.log(`✅ Allowed Origins:`, allowedOrigins);
    console.log('=================================\n');
});
