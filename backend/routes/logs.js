const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

// @desc    Get user activity logs
// @route   GET /api/logs
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ user: req.user._id })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
