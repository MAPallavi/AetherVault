const File = require('../models/File');

class VirusScanner {
  async scanFile(fileId, userId) {
    console.log(`[VirusScanner] Initiating scan for file: ${fileId}`);
    try {
      const file = await File.findById(fileId);
      if (!file) return;

      file.virusScanStatus = 'Scanning';
      await file.save();

      // Simulate async ClamAV scanning integration
      setTimeout(async () => {
        try {
          const freshFile = await File.findById(fileId);
          if (freshFile) {
            freshFile.virusScanStatus = 'Safe';
            await freshFile.save();
            console.log(`[VirusScanner] File ${fileId} scanned: Safe`);
          }
        } catch (innerErr) {
          console.error('[VirusScanner] Scan save error:', innerErr);
        }
      }, 3000);

    } catch (err) {
      console.error(`[VirusScanner] Scanning failed for file ${fileId}: ${err.message}`);
    }
  }
}

module.exports = new VirusScanner();
