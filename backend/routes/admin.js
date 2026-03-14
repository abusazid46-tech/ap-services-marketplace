// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(authorizeRoles('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// User Management
router.get('/users', adminController.getAllUsers);

// Worker Management
router.get('/workers', adminController.getAllWorkers);
router.put('/workers/:workerId/approve', adminController.approveWorker);

// Service Management (CRUD)
router.get('/services', adminController.getAllServices);
router.post('/services', adminController.createService);
router.put('/services/:serviceId', adminController.updateService);
router.delete('/services/:serviceId', adminController.deleteService);

// Booking Management
router.get('/bookings', adminController.getAllBookings);

module.exports = router;
