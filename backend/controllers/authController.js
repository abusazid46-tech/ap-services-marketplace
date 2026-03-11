// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { email, phone, password, first_name, last_name } = req.body;
        
        console.log('📝 Registration attempt:', { email, phone, first_name, last_name });
        
        // Check if user already exists
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }
        
        const existingPhone = await User.findByPhone(phone);
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this phone number'
            });
        }
        
        // Create user
        const newUser = await User.create({
            email,
            phone,
            password,
            first_name,
            last_name
        });
        
        // Generate token
        const token = generateToken(newUser.id, newUser.role);
        
        console.log('✅ Registration successful:', newUser.email);
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: newUser,
                token
            }
        });
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login attempt:', email);
        
        // Find user by email
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }
        
        // Verify password
        const isValidPassword = await User.verifyPassword(user, password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Update last login
        await User.updateLastLogin(user.id);
        
        // Generate token
        const token = generateToken(user.id, user.role);
        
        // Remove sensitive data
        delete user.password_hash;
        
        console.log('✅ Login successful:', user.email);
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                token
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        
        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
};
