const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null, // null means root directory
  },
  isFolder: {
    type: Boolean,
    required: true,
    default: false,
  },
  size: {
    type: Number,
    required: true,
    default: 0, // 0 for folders
  },
  mimeType: {
    type: String,
    default: 'application/octet-stream',
  },
  physicalPath: {
    type: String,
    required: function() { return !this.isFolder; }, // Only files have physical paths on disk
  },
  isDeleted: {
    type: Boolean,
    required: true,
    default: false,
  },
  iv: {
    type: String,
    required: function() { return !this.isFolder; }, // Only files require encryption IVs
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  permissions: {
    type: String,
    default: "Owner-RW",
  },
  visibility: {
    type: String,
    enum: ['Private', 'Shared', 'Public'],
    default: 'Private',
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: [String],
    default: [],
  },
  comments: [{
    username: { type: String, required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  sharedLinks: [{
    passcode: { type: String, default: "" },
    expiryDate: { type: Date, default: null },
    urlCode: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  versions: [{
    size: { type: Number, required: true },
    physicalPath: { type: String, required: true },
    iv: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

// Indexes for fast searching and parent folder content retrieval
fileSchema.index({ owner: 1, parentFolder: 1, isDeleted: 1 });
fileSchema.index({ owner: 1, isDeleted: 1, name: 'text' }); // Text index for file searches

module.exports = mongoose.model('File', fileSchema);
