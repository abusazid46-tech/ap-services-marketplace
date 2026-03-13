// backend/controllers/bookingController.js
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const { validationResult } = require('express-validator');

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
    try {
        // Check validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const customer_id = req.userId;
        const {
            worker_id, service_id, booking_date, start_time,
            duration_hours, customer_address, customer_notes
        } = req.body;

        // Calculate end time
        const [hours, minutes] = start_time.split(':');
        const startDate = new Date();
        startDate.setHours(parseInt(hours), parseInt(minutes), 0);
        const endDate = new Date(startDate.getTime() + duration_hours * 60 * 60 * 1000);
        const end_time = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

        // Get worker details to calculate price
        const worker = await Worker.findById(worker_id);
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker not found'
            });
        }

        // Check if worker is available
        const isAvailable = await Booking.checkAvailability(
            worker_id, booking_date, start_time, end_time
        );

        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                message: 'Worker is not available at this time'
            });
        }

        // Calculate pricing
        const hourly_rate = parseFloat(worker.hourly_rate);
        const total_amount = hourly_rate * duration_hours;
        const platform_fee = Math.round(total_amount * 0.1); // 10% platform fee
        const final_amount = total_amount + platform_fee;

        // Create booking
        const booking = await Booking.create({
            customer_id,
            worker_id,
            service_id,
            booking_date,
            start_time,
            end_time,
            duration_hours,
            total_amount,
            platform_fee,
            final_amount,
            customer_address,
            customer_notes
        });

        // Emit socket event for real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to(`worker:${worker.user_id}`).emit('new-booking', {
                message: 'You have a new booking request',
                booking: booking
            });
        }

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: booking
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        const booking = await Booking.getById(bookingId);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if user is authorized to view this booking
        if (booking.customer_id !== req.userId && booking.worker_user_id !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this booking'
            });
        }

        res.json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get booking'
        });
    }
};

// @desc    Get customer's bookings
// @route   GET /api/bookings/customer
// @access  Private
exports.getCustomerBookings = async (req, res) => {
    try {
        const { status } = req.query;
        
        const bookings = await Booking.getByCustomer(req.userId, status);
        
        // Get stats
        const stats = await Booking.getCustomerStats(req.userId);

        res.json({
            success: true,
            count: bookings.length,
            stats,
            data: bookings
        });

    } catch (error) {
        console.error('Get customer bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get bookings'
        });
    }
};

// @desc    Get worker's bookings
// @route   GET /api/bookings/worker
// @access  Private (Worker only)
exports.getWorkerBookings = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get worker profile
        const worker = await Worker.findByUserId(userId);
        
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker profile not found'
            });
        }

        const { status } = req.query;
        
        const bookings = await Booking.getByWorker(worker.id, status);
        
        // Get stats
        const stats = await Booking.getWorkerStats(worker.id);

        res.json({
            success: true,
            count: bookings.length,
            stats,
            data: bookings
        });

    } catch (error) {
        console.error('Get worker bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get bookings'
        });
    }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
exports.updateBookingStatus = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { status, reason } = req.body;
        const userId = req.userId;

        const booking = await Booking.getById(bookingId);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check authorization based on status update
        if (status === 'accepted' || status === 'rejected') {
            // Only worker can accept/reject
            const worker = await Worker.findByUserId(userId);
            if (!worker || booking.worker_id !== worker.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the assigned worker can accept/reject bookings'
                });
            }
        } else if (status === 'cancelled') {
            // Both customer and worker can cancel
            const worker = await Worker.findByUserId(userId);
            const isCustomer = booking.customer_id === userId;
            const isWorker = worker && booking.worker_id === worker.id;
            
            if (!isCustomer && !isWorker && req.userRole !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to cancel this booking'
                });
            }
        } else if (status === 'completed') {
            // Only worker can mark as completed
            const worker = await Worker.findByUserId(userId);
            if (!worker || booking.worker_id !== worker.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the worker can mark bookings as completed'
                });
            }
        }

        // Update status
        const updatedBooking = await Booking.updateStatus(bookingId, status, userId, reason);

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            // Notify customer
            io.to(`user:${booking.customer_id}`).emit('booking-update', {
                message: `Booking ${status}`,
                booking: updatedBooking
            });

            // Notify worker
            const worker = await Worker.findById(booking.worker_id);
            if (worker) {
                io.to(`user:${worker.user_id}`).emit('booking-update', {
                    message: `Booking ${status}`,
                    booking: updatedBooking
                });
            }
        }

        res.json({
            success: true,
            message: `Booking ${status} successfully`,
            data: updatedBooking
        });

    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking status'
        });
    }
};

// @desc    Get upcoming bookings for customer
// @route   GET /api/bookings/customer/upcoming
// @access  Private
exports.getCustomerUpcoming = async (req, res) => {
    try {
        const bookings = await Booking.getCustomerUpcoming(req.userId);
        
        res.json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (error) {
        console.error('Get upcoming bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get upcoming bookings'
        });
    }
};

// @desc    Get upcoming bookings for worker
// @route   GET /api/bookings/worker/upcoming
// @access  Private (Worker only)
exports.getWorkerUpcoming = async (req, res) => {
    try {
        const worker = await Worker.findByUserId(req.userId);
        
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker profile not found'
            });
        }

        const bookings = await Booking.getUpcomingBookings(worker.id);
        
        res.json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (error) {
        console.error('Get worker upcoming error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get upcoming bookings'
        });
    }
};

// @desc    Check worker availability
// @route   POST /api/bookings/check-availability
// @access  Public
exports.checkAvailability = async (req, res) => {
    try {
        const { worker_id, booking_date, start_time, duration_hours } = req.body;

        // Calculate end time
        const [hours, minutes] = start_time.split(':');
        const startDate = new Date();
        startDate.setHours(parseInt(hours), parseInt(minutes), 0);
        const endDate = new Date(startDate.getTime() + duration_hours * 60 * 60 * 1000);
        const end_time = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

        const isAvailable = await Booking.checkAvailability(
            worker_id, booking_date, start_time, end_time
        );

        res.json({
            success: true,
            available: isAvailable,
            message: isAvailable ? 'Worker is available' : 'Worker is not available at this time'
        });

    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check availability'
        });
    }
};
