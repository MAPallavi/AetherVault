const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const storage = require('../utils/storageProvider');

router.get('/liveness', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

router.get('/readiness', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'READY' : 'DOWN';
  let storageStatus = 'READY';
  try {
    const healthCheckKey = 'health-check-temp';
    await storage.write(healthCheckKey, Buffer.from('health'));
    await storage.delete(healthCheckKey);
  } catch (err) {
    storageStatus = 'DOWN';
  }

  if (dbStatus === 'READY' && storageStatus === 'READY') {
    res.json({ status: 'READY', database: dbStatus, storage: storageStatus });
  } else {
    res.status(503).json({ status: 'UNREADY', database: dbStatus, storage: storageStatus });
  }
});

module.exports = router;
