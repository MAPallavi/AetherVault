const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['Owner', 'Editor', 'Viewer', 'Read Only', 'Comment Only'],
    default: 'Viewer',
  },
  inheritedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null, // If null, permission is set directly on this file
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Permission', permissionSchema);
