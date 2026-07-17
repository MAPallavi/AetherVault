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
      role: 'Admin',
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

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  const trimmedUsername = username.trim().toLowerCase();
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const userExists = await User.findOne({ username: trimmedUsername });
    if (userExists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = await User.create({
      username: trimmedUsername,
      password,
    });

    if (user) {
      // Log registration event
      await ActivityLog.create({
        user: user._id,
        action: 'LOGIN',
        details: `New account registered: ${trimmedUsername}`,
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
      // Log failed login event
      if (user) {
        await ActivityLog.create({
          user: user._id,
          action: 'FAILED_LOGIN',
          details: `Failed login attempt for username: ${username}`,
          ipAddress: req.ip || req.connection.remoteAddress,
        });
      } else {
        await ActivityLog.create({
          action: 'FAILED_LOGIN',
          details: `Failed login attempt for unknown user: ${username}`,
          ipAddress: req.ip || req.connection.remoteAddress,
        });
      }

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

// @desc    Get user personal notes
// @route   GET /api/auth/notes
// @access  Private
router.get('/notes', protect, async (req, res) => {
  try {
    res.json({ notes: req.user.personalNotes || "" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Save user personal notes
// @route   POST /api/auth/notes
// @access  Private
router.post('/notes', protect, async (req, res) => {
  const { notes } = req.body;
  try {
    const user = await User.findById(req.user._id);
    user.personalNotes = notes || "";
    await user.save();
    res.json({ notes: user.personalNotes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update user profile settings
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  const { email, avatar, timezone, language, theme, accent } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email !== undefined) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;
    if (timezone !== undefined) user.timezone = timezone;
    if (language !== undefined) user.language = language;
    if (theme !== undefined) user.theme = theme;
    if (accent !== undefined) user.accent = accent;

    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'SETTINGS_CHANGE',
      details: 'User profile settings updated',
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({
      message: 'Profile settings updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        subscriptionPlan: user.subscriptionPlan,
        storageLimit: user.storageLimit,
        storageUsed: user.storageUsed,
        role: user.role,
        theme: user.theme,
        timezone: user.timezone,
        language: user.language,
        accent: user.accent
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Change user password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (user && (await user.matchPassword(currentPassword))) {
      user.password = newPassword;
      await user.save();

      await ActivityLog.create({
        user: req.user._id,
        action: 'SETTINGS_CHANGE',
        details: 'User password changed successfully',
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(400).json({ message: 'Incorrect current password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Log settings modification event
// @route   POST /api/auth/log-settings
// @access  Private
router.post('/log-settings', protect, async (req, res) => {
  const { details } = req.body;
  try {
    await ActivityLog.create({
      user: req.user._id,
      action: 'SETTINGS_CHANGE',
      details: details || 'Settings updated',
      ipAddress: req.ip || req.connection.remoteAddress,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get system health info
// @route   GET /api/auth/health
// @access  Private
router.get('/health', protect, async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
    
    // Server uptime
    const uptime = process.uptime(); // in seconds
    
    // Memory usage
    const memoryUsage = process.memoryUsage();
    
    // Encryption status confirmation
    const encryptionStatus = process.env.ENCRYPTION_SECRET ? 'ACTIVE' : 'INACTIVE';
    
    // API Response time benchmark
    const start = Date.now();
    await User.countDocuments({}); // quick query to test response
    const dbResponseTime = Date.now() - start;

    const storageService = require('../utils/storageProvider');
    const storageStatus = storageService.storage.getStatus();
    const storageHealth = await storageService.storage.checkHealth();

    res.json({
      status: 'HEALTHY',
      mongoStatus,
      uptime,
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      },
      encryptionStatus,
      dbResponseTime: dbResponseTime + ' ms',
      buildInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      storageStatus: {
        provider: storageStatus.provider,
        storagePath: storageStatus.storagePath,
        cloudStatus: storageStatus.cloudStatus,
        configurationStatus: storageStatus.configurationStatus,
        health: storageHealth.status,
        healthDetails: storageHealth.details
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Forgot password request
// @route   POST /api/auth/forgot-password
// @access  Public
const { sendPasswordReset } = require('../utils/emailService');
router.post('/forgot-password', async (req, res) => {
  const { username, email } = req.body;
  if (!username && !email) {
    return res.status(400).json({ message: 'Please enter username or email' });
  }

  try {
    const user = await User.findOne({
      $or: [
        { username: username ? username.trim().toLowerCase() : '' },
        { email: email ? email.trim().toLowerCase() : '' }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ message: 'No email address registered for this account. Please contact your system administrator.' });
    }

    // Generate a reset token valid for 1 hour
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

    await sendPasswordReset(user.email, resetUrl);

    res.json({ message: 'Reset email sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    await ActivityLog.create({
      user: user._id,
      action: 'SETTINGS_CHANGE',
      details: 'User password reset via token recovery',
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired password reset token' });
  }
});

// @desc    Delete user account and all owned assets
// @route   DELETE /api/auth/profile
// @access  Private
const File = require('../models/File');
const fs = require('fs/promises');
const path = require('path');
router.delete('/profile', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Delete physical files from disk
    const userFiles = await File.find({ owner: userId, isFolder: false });
    for (const file of userFiles) {
      if (file.physicalPath) {
        try {
          await fs.unlink(file.physicalPath);
        } catch (err) {
          // ignore
        }
      }
      if (file.versions) {
        for (const ver of file.versions) {
          try {
            await fs.unlink(ver.physicalPath);
          } catch (err) {
            // ignore
          }
        }
      }
    }

    // 2. Delete all DB files
    await File.deleteMany({ owner: userId });

    // 3. Delete user logs
    await ActivityLog.deleteMany({ user: userId });

    // 4. Delete user account
    await User.findByIdAndDelete(userId);

    // 5. Delete physical uploads folder
    const baseDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const userUploadDir = path.join(baseDir, userId.toString());
    try {
      await fs.rm(userUploadDir, { recursive: true, force: true });
    } catch (err) {
      // ignore
    }

    res.json({ message: 'Account and all data successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Download all user data (export as ZIP)
// @route   GET /api/auth/download-data
// @access  Private
const archiver = require('archiver');
router.get('/download-data', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const allFiles = await File.find({ owner: userId, isDeleted: false });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${req.user.username}_vault_export.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const cryptoUtils = require('../utils/crypto');

    // Recursively append active files structure
    const appendUserFiles = async (folderId, relativePath) => {
      const items = allFiles.filter(f => {
        if (!folderId) return f.parentFolder === null;
        return f.parentFolder && f.parentFolder.toString() === folderId.toString();
      });

      for (const item of items) {
        const itemPath = path.join(relativePath, item.name);
        if (item.isFolder) {
          await appendUserFiles(item._id, itemPath);
        } else {
          try {
            const encryptedData = await fs.readFile(item.physicalPath);
            const decryptedData = cryptoUtils.decrypt(encryptedData, Buffer.from(item.iv, 'hex'));
            archive.append(decryptedData, { name: itemPath });
          } catch (err) {
            console.error(`Error archiving file ${item.name}:`, err.message);
          }
        }
      }
    };

    await appendUserFiles(null, '');
    archive.finalize();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
