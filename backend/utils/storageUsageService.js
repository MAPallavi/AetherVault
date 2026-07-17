const File = require('../models/File');
const User = require('../models/User');

class StorageUsageService {
  async getUserUsage(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const quota = user.storageLimit || (5 * 1024 * 1024 * 1024); // 5GB default
    const used = user.storageUsed || 0;
    const remaining = Math.max(0, quota - used);
    const percentage = quota > 0 ? (used / quota) * 100 : 0;

    return {
      used,
      remaining,
      quota,
      percentage
    };
  }

  async getLargestFiles(userId, limit = 10) {
    return await File.find({ owner: userId, isFolder: false, isDeleted: false })
      .sort({ size: -1 })
      .limit(limit);
  }

  async getLargestFolders(userId, limit = 5) {
    const folders = await File.find({ owner: userId, isFolder: true, isDeleted: false });
    const allFiles = await File.find({ owner: userId, isFolder: false, isDeleted: false });

    const folderSizes = folders.map(folder => {
      const getNestedSize = (fId) => {
        let size = 0;
        // Direct files
        const directFiles = allFiles.filter(f => f.parentFolder && f.parentFolder.toString() === fId.toString());
        directFiles.forEach(f => {
          size += f.size || 0;
          if (f.versions) {
            f.versions.forEach(v => { size += v.size || 0; });
          }
        });
        // Sub folders
        const subFolders = folders.filter(f => f.parentFolder && f.parentFolder.toString() === fId.toString());
        subFolders.forEach(sf => {
          size += getNestedSize(sf._id);
        });
        return size;
      };

      return {
        _id: folder._id,
        name: folder.name,
        size: getNestedSize(folder._id),
        parentFolder: folder.parentFolder
      };
    });

    return folderSizes.sort((a, b) => b.size - a.size).slice(0, limit);
  }

  async updateStorageUsed(userId) {
    const userFiles = await File.find({ owner: userId, isFolder: false });
    let totalSize = 0;
    for (const f of userFiles) {
      totalSize += f.size || 0;
      if (f.versions && f.versions.length > 0) {
        f.versions.forEach(v => { totalSize += v.size || 0; });
      }
    }

    await User.findByIdAndUpdate(userId, { storageUsed: totalSize });
    return totalSize;
  }
}

module.exports = new StorageUsageService();
