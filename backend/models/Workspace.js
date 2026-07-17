const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['Personal', 'Team', 'Department'],
    default: 'Personal',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['Owner', 'Editor', 'Viewer'], default: 'Viewer' }
  }],
  storageLimit: {
    type: Number,
    default: 10 * 1024 * 1024 * 1024, // 10 GB default
  },
  storageUsed: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Workspace', workspaceSchema);
