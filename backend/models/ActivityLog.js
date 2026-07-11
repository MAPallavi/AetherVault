const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for failed login attempts where user does not exist
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'FAILED_LOGIN', 'UPLOAD', 'DOWNLOAD', 'PREVIEW', 'DELETE',
      'RESTORE', 'RENAME', 'CREATE_FOLDER', 'PURGE', 'FAVORITE', 'UNFAVORITE',
      'TAG_UPDATE', 'COMMENT', 'SHARE', 'SHARE_DELETE', 'UPLOAD_VERSION',
      'SETTINGS_CHANGE'
    ],
  },
  details: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

activityLogSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
