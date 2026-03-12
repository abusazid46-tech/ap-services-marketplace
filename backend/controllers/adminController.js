// backend/controllers/adminController.js
const Worker = require('../models/Worker');
const User = require('../models/User');

// @desc    Get all pending workers
// @route   GET /api/admin/workers/pending
// @access  Private (Admin only)
exports.getPendingWorkers = async (req, res) => {
    try {
        const workers = await Worker.getPendingWorkers();
        
        res.json({
            success: true,
            count: workers.length,
            data: workers
        });
    } catch (error) {
        console.error('Get pending workers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending workers'
        });
    }
};

// @desc    Approve or reject worker
// @route   PUT /api/admin/workers/:workerId/status
// @access  Private (Admin only)
exports.updateWorkerStatus = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either approved or rejected'
            });
        }

        const worker = await Worker.updateApprovalStatus(workerId, status);

        res.json({
            success: true,
            message: `Worker ${status} successfully`,
            data: worker
        });

    } catch (error) {
        console.error('Update worker status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update worker status'
        });
    }
};
