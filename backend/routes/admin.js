const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const File = require('../models/File');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/auth');

// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Admin Only
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Admin Only
router.put('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = req.body.role || user.role;
    await user.save();

    res.json({ message: `Role updated for ${user.username} to ${user.role}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update user subscription plan & storage limits
// @route   PUT /api/admin/users/:id/plan
// @access  Admin Only
router.put('/users/:id/plan', protect, adminOnly, async (req, res) => {
  const { plan, storageLimit } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (plan) user.subscriptionPlan = plan;
    if (storageLimit) user.storageLimit = Number(storageLimit);

    await user.save();
    res.json({ message: `Plan updated for ${user.username}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get admin statistics & server health
// @route   GET /api/admin/status
// @access  Admin Only
router.get('/status', protect, adminOnly, async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    const totalFilesCount = await File.countDocuments({ isFolder: false });
    const totalFoldersCount = await File.countDocuments({ isFolder: true });

    // Calculate aggregated storage used in platform
    const files = await File.find({ isFolder: false });
    let totalPlatformStorageBytes = 0;
    files.forEach(f => {
      totalPlatformStorageBytes += f.size || 0;
      if (f.versions) {
        f.versions.forEach(v => {
          totalPlatformStorageBytes += v.size || 0;
        });
      }
    });

    const dbState = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';

    res.json({
      platformUsers: userCount,
      totalFiles: totalFilesCount,
      totalFolders: totalFoldersCount,
      totalStorageBytes: totalPlatformStorageBytes,
      databaseState: dbState,
      serverMemoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
