const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['LOGIN', 'UPLOAD', 'DOWNLOAD', 'PREVIEW', 'DELETE', 'RESTORE', 'RENAME', 'CREATE_FOLDER', 'PURGE'],
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
