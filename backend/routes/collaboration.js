const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const Invitation = require('../models/Invitation');
const Permission = require('../models/Permission');
const Notification = require('../models/Notification');
const File = require('../models/File');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const collaborationService = require('../services/collaborationService');
const ActivityLog = require('../models/ActivityLog');

// 1. WORKSPACES
// @route   GET /api/collaboration/workspaces
// @access  Private
router.get('/workspaces', protect, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user._id },
        { "members.user": req.user._id }
      ]
    }).populate('owner', 'username email');
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/collaboration/workspaces
// @access  Private
router.post('/workspaces', protect, async (req, res) => {
  const { name, type } = req.body;
  try {
    const workspace = await Workspace.create({
      name,
      type,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'Owner' }]
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'COLLABORATION_CHANGE',
      details: `Created workspace: ${name} (Type: ${type})`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. INVITATIONS
// @route   GET /api/collaboration/invitations
// @access  Private
router.get('/invitations', protect, async (req, res) => {
  try {
    const invitations = await Invitation.find({
      inviteeEmail: req.user.email
    }).populate('workspace inviter', 'name username email');
    res.json(invitations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/collaboration/invitations
// @access  Private
router.post('/invitations', protect, async (req, res) => {
  const { workspaceId, inviteeEmail, role } = req.body;
  try {
    const invitation = await collaborationService.inviteUser(workspaceId, req.user._id, inviteeEmail, role);

    await ActivityLog.create({
      user: req.user._id,
      action: 'COLLABORATION_CHANGE',
      details: `Invited user ${inviteeEmail} to join workspace ${workspaceId}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.status(201).json(invitation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/collaboration/invitations/:id/accept
// @access  Private
router.put('/invitations/:id/accept', protect, async (req, res) => {
  try {
    const workspace = await collaborationService.acceptInvitation(req.params.id, req.user._id);

    await ActivityLog.create({
      user: req.user._id,
      action: 'COLLABORATION_CHANGE',
      details: `Accepted invitation ID ${req.params.id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({ message: 'Invitation accepted successfully', workspace });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/collaboration/invitations/:id/decline
// @access  Private
router.put('/invitations/:id/decline', protect, async (req, res) => {
  try {
    const invitation = await collaborationService.declineInvitation(req.params.id, req.user._id);

    await ActivityLog.create({
      user: req.user._id,
      action: 'COLLABORATION_CHANGE',
      details: `Declined invitation ID ${req.params.id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({ message: 'Invitation declined successfully', invitation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. SHARING FOLDERS
// @route   POST /api/collaboration/share-folder
// @access  Private
router.post('/share-folder', protect, async (req, res) => {
  const { fileId, targetEmail, role } = req.body;
  try {
    const targetUser = await User.findOne({ email: targetEmail });
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user email not registered' });
    }

    const permission = await collaborationService.shareFolder(fileId, req.user._id, targetUser._id, role);

    await ActivityLog.create({
      user: req.user._id,
      action: 'COLLABORATION_CHANGE',
      details: `Shared folder ID ${fileId} with ${targetEmail}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.status(201).json(permission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. NOTIFICATIONS
// @route   GET /api/collaboration/notifications
// @access  Private
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/collaboration/notifications/:id/read
// @access  Private
router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
