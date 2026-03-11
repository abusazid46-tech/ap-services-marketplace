// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin, checkValidation } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.post('/register', validateRegistration, checkValidation, authController.register);
router.post('/login', validateLogin, checkValidation, authController.login);

// Protected routes
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
