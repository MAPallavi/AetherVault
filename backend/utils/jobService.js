const ActivityLog = require('../models/ActivityLog');

class JobService {
  async queueJob(userId, jobType, fileId, details = {}) {
    console.log(`[JobService] Queued job "${jobType}" for file ${fileId} (User: ${userId})`);

    // Log system event to activity log for structural auditing
    try {
      await ActivityLog.create({
        user: userId,
        action: 'SYSTEM_EVENT',
        details: `Scheduled background job: ${jobType} for file ID ${fileId}`,
        ipAddress: '127.0.0.1'
      });
    } catch (err) {
      console.error(`[JobService] Failed to create system activity log: ${err.message}`);
    }

    // Return job handle stub
    return {
      jobId: `${jobType}_${Date.now()}_${fileId}`,
      status: 'queued'
    };
  }

  async processJob(userId, jobType, fileId, details) {
    console.log(`[JobService] Processing job "${jobType}" for file ${fileId}`);
    if (jobType === 'VIRUS_SCANNING') {
      const virusScanner = require('../services/virusScanner');
      virusScanner.scanFile(fileId, userId).catch(err => {
        console.error(`[JobService] Scan trigger error: ${err.message}`);
      });
    }
  }
}

module.exports = new JobService();
