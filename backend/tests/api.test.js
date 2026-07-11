const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const File = require('../models/File');
const cryptoUtils = require('../utils/crypto');

// Mock Database Models
jest.mock('../models/User');
jest.mock('../models/File');
jest.mock('../models/ActivityLog');

describe('File Manager Backend APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Encryption Utility Tests', () => {
    it('should correctly encrypt and decrypt raw text bytes', () => {
      const plaintext = Buffer.from('Sensitive documents content running in the secure file manager');
      const iv = cryptoUtils.generateIv();
      
      const encrypted = cryptoUtils.encrypt(plaintext, iv);
      expect(encrypted).not.toEqual(plaintext);

      const decrypted = cryptoUtils.decrypt(encrypted, iv);
      expect(decrypted.toString()).toEqual(plaintext.toString());
    });
  });

  describe('Authentication Routes', () => {
    it('GET /api/auth/status - should report whether admin is registered', async () => {
      User.countDocuments.mockResolvedValue(0);

      const res = await request(app).get('/api/auth/status');
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isSetup: false });
      expect(User.countDocuments).toHaveBeenCalled();
    });

    it('POST /api/auth/setup - should fail if setup already completed', async () => {
      User.countDocuments.mockResolvedValue(1);

      const res = await request(app)
        .post('/api/auth/setup')
        .send({ username: 'admin', password: 'securepassword123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Setup already completed');
    });

    it('POST /api/auth/login - should fail with invalid credentials', async () => {
      User.findOne.mockResolvedValue(null); // No user found

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'fakeuser', password: 'badpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid username or password');
    });
  });

  describe('File API Routes', () => {
    it('GET /api/files - should reject requests without a JWT token', async () => {
      const res = await request(app).get('/api/files');
      expect(res.status).toBe(401);
    });

    it('GET /api/files/stats/insights - should reject requests without a JWT token', async () => {
      const res = await request(app).get('/api/files/stats/insights');
      expect(res.status).toBe(401);
    });
  });
});
