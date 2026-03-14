// backend/controllers/adminController.js
const db = require('../config/database');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Booking = require('../models/Booking');

// ==================== DASHBOARD STATS ====================
exports.getDashboardStats = async (req, res) => {
    try {
        console.log('📊 Fetching admin dashboard stats...');
        
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE role = 'worker') as total_workers,
                (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
                (SELECT COUNT(*) FROM workers WHERE approval_status = 'pending') as pending_workers,
                (SELECT COUNT(*) FROM bookings) as total_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
                (SELECT COALESCE(SUM(final_amount), 0) FROM bookings WHERE status = 'completed') as total_revenue,
                (SELECT COALESCE(SUM(platform_fee), 0) FROM bookings WHERE status = 'completed') as platform_fees,
                (SELECT COUNT(*) FROM reviews) as total_reviews,
                (SELECT COALESCE(AVG(rating), 0) FROM reviews) as avg_rating
        `);

        // Recent activity
        const recentActivity = await db.query(`
            (SELECT 'user' as type, id, created_at, 
             CONCAT(first_name, ' ', last_name, ' joined') as description 
             FROM users ORDER BY created_at DESC LIMIT 5)
            UNION ALL
            (SELECT 'booking' as type, id, created_at, 
             CONCAT('Booking #', booking_number) as description 
             FROM bookings ORDER BY created_at DESC LIMIT 5)
            UNION ALL
            (SELECT 'review' as type, id, created_at, 
             CONCAT('New ', rating, '-star review') as description 
             FROM reviews ORDER BY created_at DESC LIMIT 5)
            ORDER BY created_at DESC LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                stats: stats.rows[0],
                recentActivity: recentActivity.rows
            }
        });
    } catch (error) {
        console.error('❌ Dashboard stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get stats',
            error: error.message 
        });
    }
};

// ==================== USER MANAGEMENT ====================
exports.getAllUsers = async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT id, email, phone, first_name, last_name, role, 
                   is_active, is_verified, created_at, last_login
            FROM users WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (role && role !== 'all') {
            query += ` AND role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }

        if (search) {
            query += ` AND (email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} 
                      OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = query.replace(
            /SELECT.*FROM/,
            'SELECT COUNT(*) as total FROM'
        );
        const totalResult = await db.query(countQuery, params);
        const total = parseInt(totalResult.rows[0].total);

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to get users' });
    }
};

// ==================== WORKER MANAGEMENT ====================
exports.getAllWorkers = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT w.*, u.first_name, u.last_name, u.email, u.phone,
                   u.is_active as user_active
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            query += ` AND w.approval_status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} 
                      OR u.last_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = query.replace(
            /SELECT.*FROM/,
            'SELECT COUNT(*) as total FROM'
        );
        const totalResult = await db.query(countQuery, params);
        const total = parseInt(totalResult.rows[0].total);

        query += ` ORDER BY w.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Get workers error:', error);
        res.status(500).json({ success: false, message: 'Failed to get workers' });
    }
};

// ==================== SERVICE MANAGEMENT ====================
exports.getAllServices = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, 
                   COUNT(DISTINCT ws.worker_id) as worker_count
            FROM services s
            LEFT JOIN worker_services ws ON s.id = ws.service_id
            GROUP BY s.id
            ORDER BY s.category, s.name
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('❌ Get services error:', error);
        res.status(500).json({ success: false, message: 'Failed to get services' });
    }
};

exports.createService = async (req, res) => {
    try {
        const { name, category, description, icon, base_price, price_type } = req.body;
        
        const result = await db.query(`
            INSERT INTO services (name, category, description, icon, base_price, price_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, category, description, icon, base_price, price_type]);

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Create service error:', error);
        res.status(500).json({ success: false, message: 'Failed to create service' });
    }
};

exports.updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { name, category, description, icon, base_price, price_type, is_active } = req.body;
        
        const result = await db.query(`
            UPDATE services 
            SET name = COALESCE($1, name),
                category = COALESCE($2, category),
                description = COALESCE($3, description),
                icon = COALESCE($4, icon),
                base_price = COALESCE($5, base_price),
                price_type = COALESCE($6, price_type),
                is_active = COALESCE($7, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [name, category, description, icon, base_price, price_type, is_active, serviceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        res.json({
            success: true,
            message: 'Service updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Update service error:', error);
        res.status(500).json({ success: false, message: 'Failed to update service' });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        
        // Soft delete - just mark as inactive
        const result = await db.query(
            'UPDATE services SET is_active = false WHERE id = $1 RETURNING id',
            [serviceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('❌ Delete service error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete service' });
    }
};

// ==================== WORKER APPROVAL ====================
exports.approveWorker = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        const result = await db.query(`
            UPDATE workers 
            SET approval_status = $1, 
                is_approved = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [status, status === 'approved', workerId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Worker not found' });
        }

        res.json({
            success: true,
            message: `Worker ${status} successfully`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Approve worker error:', error);
        res.status(500).json({ success: false, message: 'Failed to update worker status' });
    }
};

// ==================== BOOKING MANAGEMENT ====================
exports.getAllBookings = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT b.*,
                   c.first_name as customer_name,
                   c.last_name as customer_last_name,
                   w.first_name as worker_name,
                   w.last_name as worker_last_name,
                   s.name as service_name
            FROM bookings b
            JOIN users c ON b.customer_id = c.id
            JOIN workers wk ON b.worker_id = wk.id
            JOIN users w ON wk.user_id = w.id
            JOIN services s ON b.service_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            query += ` AND b.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('❌ Get bookings error:', error);
        res.status(500).json({ success: false, message: 'Failed to get bookings' });
    }
};

// ==================== ANALYTICS ====================
exports.getAnalytics = async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let interval;
        if (period === 'week') interval = '1 week';
        else if (period === 'month') interval = '1 month';
        else interval = '1 year';

        // Revenue over time
        const revenueOverTime = await db.query(`
            SELECT DATE_TRUNC('day', created_at) as date,
                   COUNT(*) as bookings,
                   SUM(final_amount) as revenue
            FROM bookings
            WHERE created_at > NOW() - INTERVAL '${interval}'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date DESC
        `);

        // Popular services
        const popularServices = await db.query(`
            SELECT s.name, COUNT(b.id) as booking_count
            FROM services s
            LEFT JOIN bookings b ON s.id = b.service_id
            WHERE b.created_at > NOW() - INTERVAL '${interval}'
            GROUP BY s.id
            ORDER BY booking_count DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                revenueOverTime: revenueOverTime.rows,
                popularServices: popularServices.rows
            }
        });
    } catch (error) {
        console.error('❌ Get analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to get analytics' });
    }
};
