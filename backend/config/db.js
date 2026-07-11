const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Migrate/re-align user storage values on startup
    try {
      const User = require('../models/User');
      const File = require('../models/File');
      const users = await User.find({});
      for (const u of users) {
        let changed = false;
        if (u.storageLimit === undefined || u.storageLimit === null) {
          u.storageLimit = 10 * 1024 * 1024 * 1024;
          changed = true;
        }
        
        // Sum sizes of all files and versions owned by the user
        const userFiles = await File.find({ owner: u._id });
        let totalSize = 0;
        for (const f of userFiles) {
          if (!f.isFolder) {
            totalSize += f.size || 0;
            if (f.versions && f.versions.length > 0) {
              f.versions.forEach(v => { totalSize += v.size || 0; });
            }
          }
        }
        if (u.storageUsed !== totalSize) {
          u.storageUsed = totalSize;
          changed = true;
        }
        if (changed) {
          await u.save();
          console.log(`Migrated user ${u.username}: storageLimit set and storageUsed calculated at ${totalSize} bytes.`);
        }
      }
    } catch (migErr) {
      console.error(`Migration warning: ${migErr.message}`);
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
