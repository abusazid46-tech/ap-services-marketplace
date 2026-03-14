// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// All admin routes require admin role
router.use(verifyToken);
router.use(authorizeRoles('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId/status', adminController.updateUserStatus);

// Worker Management
router.get('/workers', adminController.getAllWorkers);
router.get('/workers/:workerId', adminController.getWorkerDetails);
router.put('/workers/:workerId/approve', adminController.approveWorker);

// Service Management (CRUD)
router.get('/services', adminController.getAllServices);
router.post('/services', adminController.createService);
router.put('/services/:serviceId', adminController.updateService);
router.delete('/services/:serviceId', adminController.deleteService);

// Booking Management
router.get('/bookings', adminController.getAllBookings);

module.exports = router;
