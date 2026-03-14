// backend/controllers/adminController.js
const db = require('../config/database');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

// ==================== DASHBOARD STATS ====================
exports.getDashboardStats = async (req, res) => {
    try {
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
            (SELECT 'user' as type, id, created_at, email as description 
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
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
};

// ==================== USER MANAGEMENT ====================
exports.getAllUsers = async (req, res) => {
    try {
        const { role, status, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT id, email, phone, first_name, last_name, role, 
                   is_active, is_verified, created_at, last_login
            FROM users WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (role) {
            query += ` AND role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }

        if (status === 'active') {
            query += ` AND is_active = true`;
        } else if (status === 'inactive') {
            query += ` AND is_active = false`;
        }

        if (search) {
            query += ` AND (email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} 
                      OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Get total count
        const countQuery = query.replace(
            /SELECT.*FROM/,
            'SELECT COUNT(*) as total FROM'
        ).split('ORDER BY')[0];
        const totalResult = await db.query(countQuery, params.slice(0, paramIndex - 1));
        const total = parseInt(totalResult.rows[0].total);

        // Add pagination
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
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to get users' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get user stats
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM bookings WHERE customer_id = $1) as total_bookings,
                (SELECT COUNT(*) FROM bookings WHERE customer_id = $1 AND status = 'completed') as completed_bookings,
                (SELECT COUNT(*) FROM reviews WHERE customer_id = $1) as total_reviews,
                (SELECT COALESCE(SUM(final_amount), 0) FROM bookings WHERE customer_id = $1 AND status = 'completed') as total_spent
        `, [userId]);

        res.json({
            success: true,
            data: {
                ...user,
                stats: stats.rows[0]
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Failed to get user' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { is_active } = req.body;

        const result = await db.query(
            'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, is_active',
            [is_active, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user status' });
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
                      OR u.last_name ILIKE $${paramIndex} OR w.bio ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = query.replace(
            /SELECT w.*, u.first_name.*FROM/,
            'SELECT COUNT(*) as total FROM'
        ).split('ORDER BY')[0];
        const totalResult = await db.query(countQuery, params.slice(0, paramIndex - 1));
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
        console.error('Get workers error:', error);
        res.status(500).json({ success: false, message: 'Failed to get workers' });
    }
};

exports.getWorkerDetails = async (req, res) => {
    try {
        const { workerId } = req.params;

        const worker = await Worker.findById(workerId);
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found' });
        }

        // Get services
        const services = await Worker.getServices(workerId);

        // Get stats
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM bookings WHERE worker_id = $1) as total_bookings,
                (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'completed') as completed_bookings,
                (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE worker_id = $1) as avg_rating,
                (SELECT COUNT(*) FROM reviews WHERE worker_id = $1) as total_reviews,
                (SELECT COALESCE(SUM(final_amount), 0) FROM bookings WHERE worker_id = $1 AND status = 'completed') as total_earnings
        `, [workerId]);

        res.json({
            success: true,
            data: {
                ...worker,
                services,
                stats: stats.rows[0]
            }
        });
    } catch (error) {
        console.error('Get worker details error:', error);
        res.status(500).json({ success: false, message: 'Failed to get worker details' });
    }
};

exports.approveWorker = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        const worker = await Worker.updateApprovalStatus(workerId, status);

        // Get user email for notification
        const user = await db.query(
            'SELECT email, first_name FROM users WHERE id = $1',
            [worker.user_id]
        );

        res.json({
            success: true,
            message: `Worker ${status} successfully`,
            data: worker
        });
    } catch (error) {
        console.error('Approve worker error:', error);
        res.status(500).json({ success: false, message: 'Failed to update worker status' });
    }
};

// ==================== SERVICE MANAGEMENT ====================
exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.getAll();
        res.json({ success: true, data: services });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ success: false, message: 'Failed to get services' });
    }
};

exports.createService = async (req, res) => {
    try {
        const { name, category, description, icon, base_price, price_type } = req.body;

        const service = await Service.create({
            name, category, description, icon, base_price, price_type
        });

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: service
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ success: false, message: 'Failed to create service' });
    }
};

exports.updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const updates = req.body;

        const service = await Service.update(serviceId, updates);

        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        res.json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
    } catch (error) {
        console.error('Update service error:', error);
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
        console.error('Delete service error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete service' });
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
                   w.first_name as worker_name,
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

        if (status) {
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
        console.error('Get bookings error:', error);
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
        else if (period === 'year') interval = '1 year';

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

        // User growth
        const userGrowth = await db.query(`
            SELECT DATE_TRUNC('day', created_at) as date,
                   COUNT(*) as new_users
            FROM users
            WHERE created_at > NOW() - INTERVAL '${interval}'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date DESC
        `);

        res.json({
            success: true,
            data: {
                revenueOverTime: revenueOverTime.rows,
                popularServices: popularServices.rows,
                userGrowth: userGrowth.rows
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to get analytics' });
    }
};
