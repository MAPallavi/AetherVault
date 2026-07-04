const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Get setup status (checks if any user exists)
// @route   GET /api/auth/status
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    res.json({ isSetup: userCount > 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Setup initial admin account (only works if no users exist)
// @route   POST /api/auth/setup
// @access  Public
router.post('/setup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      return res.status(400).json({ message: 'Setup already completed' });
    }

    const user = await User.create({
      username,
      password,
    });

    if (user) {
      // Log this setup event
      await ActivityLog.create({
        user: user._id,
        action: 'LOGIN',
        details: 'Initial admin account setup and login',
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      res.status(201).json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      // Log login event
      await ActivityLog.create({
        user: user._id,
        action: 'LOGIN',
        details: 'User logged in successfully',
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      res.json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
