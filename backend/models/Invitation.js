const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  inviteeEmail: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['Owner', 'Editor', 'Viewer'],
    default: 'Viewer',
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Declined', 'Expired'],
    default: 'Pending',
  },
  token: {
    type: String,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Invitation', invitationSchema);
