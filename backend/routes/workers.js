// backend/routes/workers.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const workerController = require('../controllers/workerController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Validation rules for worker registration
const validateWorkerRegistration = [
    body('bio')
        .notEmpty()
        .withMessage('Bio is required')
        .isLength({ max: 500 })
        .withMessage('Bio must be less than 500 characters'),
    body('experience_years')
        .isInt({ min: 0, max: 50 })
        .withMessage('Experience years must be between 0 and 50'),
    body('hourly_rate')
        .isFloat({ min: 50 })
        .withMessage('Hourly rate must be at least ₹50')
];

// Public routes
router.get('/nearby', workerController.getNearbyWorkers);
router.get('/:id', workerController.getWorkerProfile);

// Protected routes
router.post('/register',
    verifyToken,
    upload.fields([
        { name: 'idProof', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 },
        { name: 'profilePhoto', maxCount: 1 }
    ]),
    validateWorkerRegistration,
    workerController.registerAsWorker
);

router.put('/availability',
    verifyToken,
    workerController.updateAvailability
);

router.get('/dashboard/stats',
    verifyToken,
    workerController.getDashboard
);

module.exports = router;
