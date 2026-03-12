// backend/controllers/workerController.js
const Worker = require('../models/Worker');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

// @desc    Register as a worker
// @route   POST /api/workers/register
// @access  Private
exports.registerAsWorker = async (req, res) => {
    try {
        // Check validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = req.userId;
        const { bio, experience_years, hourly_rate, services } = req.body;

        // Check if user already has a worker profile
        const existingWorker = await Worker.findByUserId(userId);
        if (existingWorker) {
            return res.status(400).json({
                success: false,
                message: 'You already have a worker profile'
            });
        }

        // Handle file uploads
        const files = req.files;
        let idProofUrl = null;
        let addressProofUrl = null;
        let profilePhotoUrl = null;

        if (files) {
            if (files.idProof) {
                idProofUrl = `/uploads/${files.idProof[0].filename}`;
            }
            if (files.addressProof) {
                addressProofUrl = `/uploads/${files.addressProof[0].filename}`;
            }
            if (files.profilePhoto) {
                profilePhotoUrl = `/uploads/${files.profilePhoto[0].filename}`;
            }
        }

        // Create worker profile
        const worker = await Worker.create({
            user_id: userId,
            bio,
            experience_years: parseInt(experience_years),
            hourly_rate: parseFloat(hourly_rate),
            id_proof_url: idProofUrl,
            address_proof_url: addressProofUrl,
            profile_photo_url: profilePhotoUrl
        });

        // Add services if provided
        if (services) {
            const serviceList = JSON.parse(services);
            for (const service of serviceList) {
                await Worker.addService(worker.id, service.serviceId, service.customRate);
            }
        }

        // Get user details
        const user = await User.findById(userId);

        res.status(201).json({
            success: true,
            message: 'Worker registration submitted for approval',
            data: {
                worker,
                user
            }
        });

    } catch (error) {
        console.error('Worker registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register as worker',
            error: error.message
        });
    }
};

// @desc    Get worker profile
// @route   GET /api/workers/:id
// @access  Public
exports.getWorkerProfile = async (req, res) => {
    try {
        const workerId = req.params.id;
        
        const worker = await Worker.findById(workerId);
        
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker not found'
            });
        }

        // Get worker's services
        const services = await Worker.getServices(workerId);

        res.json({
            success: true,
            data: {
                ...worker,
                services
            }
        });

    } catch (error) {
        console.error('Get worker profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get worker profile'
        });
    }
};

// @desc    Get nearby workers
// @route   GET /api/workers/nearby
// @access  Public
exports.getNearbyWorkers = async (req, res) => {
    try {
        const { latitude, longitude, serviceId, radius = 10 } = req.query;
        
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const workers = await Worker.findNearby(
            parseFloat(latitude),
            parseFloat(longitude),
            serviceId || null,
            parseFloat(radius)
        );

        res.json({
            success: true,
            count: workers.length,
            data: workers
        });

    } catch (error) {
        console.error('Get nearby workers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get nearby workers'
        });
    }
};

// @desc    Update worker availability
// @route   PUT /api/workers/availability
// @access  Private (Worker only)
exports.updateAvailability = async (req, res) => {
    try {
        const userId = req.userId;
        const { is_available } = req.body;

        // Get worker profile
        const worker = await Worker.findByUserId(userId);
        
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker profile not found'
            });
        }

        const updated = await Worker.updateAvailability(worker.id, is_available);

        res.json({
            success: true,
            message: `You are now ${is_available ? 'available' : 'offline'}`,
            data: updated
        });

    } catch (error) {
        console.error('Update availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update availability'
        });
    }
};

// @desc    Get worker dashboard stats
// @route   GET /api/workers/dashboard
// @access  Private (Worker only)
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.userId;
        
        const worker = await Worker.findByUserId(userId);
        
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker profile not found'
            });
        }

        // Get stats
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'pending') as pending_jobs,
                (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'completed') as completed_jobs,
                (SELECT COALESCE(SUM(final_amount), 0) FROM bookings WHERE worker_id = $1 AND status = 'completed') as total_earnings,
                (SELECT AVG(rating) FROM reviews WHERE worker_id = $1) as avg_rating
        `, [worker.id]);

        // Get recent bookings
        const recentBookings = await db.query(`
            SELECT b.*, 
                   u.first_name as customer_name,
                   s.name as service_name
            FROM bookings b
            JOIN users u ON b.customer_id = u.id
            JOIN services s ON b.service_id = s.id
            WHERE b.worker_id = $1
            ORDER BY b.created_at DESC
            LIMIT 5
        `, [worker.id]);

        res.json({
            success: true,
            data: {
                stats: stats.rows[0],
                recent_bookings: recentBookings.rows,
                profile: worker
            }
        });

    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard data'
        });
    }
};
