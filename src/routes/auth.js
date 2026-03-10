const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Validation rules
const registerValidation = [
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('phone').isMobilePhone('en-IN').withMessage('Please enter a valid Indian phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required').trim(),
    body('lastName').notEmpty().withMessage('Last name is required').trim()
];

const loginValidation = [
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail()
];

const resetPasswordValidation = [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
