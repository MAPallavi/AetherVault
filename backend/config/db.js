const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let retries = 5;
    let conn;
    while (retries > 0) {
      try {
        conn = await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          autoIndex: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        break;
      } catch (error) {
        retries -= 1;
        console.error(`MongoDB Connection Error: ${error.message}. Retries remaining: ${retries}`);
        if (retries === 0) {
          process.exit(1);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Migrate/re-align user storage values on startup
    try {
      const User = require('../models/User');
      const File = require('../models/File');
      const users = await User.find({});
      for (const u of users) {
        let changed = false;
        if (u.storageLimit === undefined || u.storageLimit === null || u.storageLimit === 10 * 1024 * 1024 * 1024) {
          u.storageLimit = 5 * 1024 * 1024 * 1024;
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
  } catch (outerErr) {
    console.error(`Database startup logic error: ${outerErr.message}`);
  }
};

module.exports = connectDB;
