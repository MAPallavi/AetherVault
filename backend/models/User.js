const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
  },
  personalNotes: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: "",
  },
  avatar: {
    type: String,
    default: "",
  },
  subscriptionPlan: {
    type: String,
    enum: ['Free', 'Premium', 'Business', 'Enterprise'],
    default: 'Free',
  },
  accountStatus: {
    type: String,
    enum: ['Active', 'Suspended', 'Pending'],
    default: 'Active',
  },
  role: {
    type: String,
    enum: ['User', 'Admin', 'Moderator'],
    default: 'User',
  },
  lastLogin: {
    type: Date,
  },
  timezone: {
    type: String,
    default: "UTC",
  },
  language: {
    type: String,
    default: "en",
  },
  theme: {
    type: String,
    default: "dark",
  },
  accent: {
    type: String,
    default: "#7C3AED",
  },
  storageLimit: {
    type: Number,
    default: 20 * 1024 * 1024 * 1024, // 20 GB default limit
  },
  storageUsed: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
