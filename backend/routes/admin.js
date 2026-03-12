// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// All admin routes require admin role
router.use(verifyToken);
router.use(authorizeRoles('admin'));

// Worker management
router.get('/workers/pending', adminController.getPendingWorkers);
router.put('/workers/:workerId/status', adminController.updateWorkerStatus);

module.exports = router;
