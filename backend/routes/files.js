const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const mongoose = require('mongoose');
const archiver = require('archiver');
const mimeTypes = require('mime-types');

const File = require('../models/File');
const ActivityLog = require('../models/ActivityLog');
const cryptoUtils = require('../utils/crypto');
const { protect } = require('../middleware/auth');
const { storage } = require('../utils/storageProvider');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const crypto = require('crypto');
const jobService = require('../utils/jobService');
const User = require('../models/User');

// Multer in-memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB file size limit
});

// Helper to ensure upload directory exists
const getUploadDir = async (userId) => {
  const baseDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  const uploadDir = userId ? path.join(baseDir, userId.toString()) : baseDir;
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  return uploadDir;
};

// Helper: Recursively soft delete files and folders
const setDeletedStatusRecursive = async (fileId, userId, isDeleted) => {
  const file = await File.findOne({ _id: fileId, owner: userId });
  if (!file) return;

  file.isDeleted = isDeleted;
  await file.save();

  if (file.isFolder) {
    const children = await File.find({ parentFolder: fileId, owner: userId });
    for (const child of children) {
      await setDeletedStatusRecursive(child._id, userId, isDeleted);
    }
  }
};

// Helper: Recursively permanently delete files and folders
const deleteFileOrFolderRecursive = async (fileId, userId, uploadDir) => {
  const file = await File.findOne({ _id: fileId, owner: userId });
  if (!file) return 0;

  let deletedSize = 0;

  if (file.isFolder) {
    const children = await File.find({ parentFolder: fileId, owner: userId });
    for (const child of children) {
      deletedSize += await deleteFileOrFolderRecursive(child._id, userId, uploadDir);
    }
  } else {
    deletedSize += file.size;
    // Also delete physical versions and add their size to freed space
    if (file.versions && file.versions.length > 0) {
      for (const ver of file.versions) {
        deletedSize += ver.size;
        try {
          await storage.delete(ver.physicalPath);
        } catch (err) {
          console.error(`Error deleting physical version file ${ver.physicalPath}:`, err.message);
        }
      }
    }
    // Delete physical file from disk
    if (file.physicalPath) {
      try {
        await storage.delete(file.physicalPath);
      } catch (err) {
        // Log error but continue deleting from database
        console.error(`Error deleting physical file ${file.physicalPath}:`, err.message);
      }
    }
  }

  // Delete from DB
  await File.deleteOne({ _id: fileId });
  return deletedSize;
};

// Helper: Add file or folder recursively to a zip archive
const addFolderToZip = async (folderId, userId, zip, currentRelativePath, uploadDir) => {
  const items = await File.find({ parentFolder: folderId, owner: userId, isDeleted: false });

  for (const item of items) {
    const itemPath = path.join(currentRelativePath, item.name);
    if (item.isFolder) {
      // Create empty folder in zip or recurse
      await addFolderToZip(item._id, userId, zip, itemPath, uploadDir);
    } else {
      try {
        const encryptedData = await storage.read(item.physicalPath);
        const decryptedData = cryptoUtils.decrypt(encryptedData, Buffer.from(item.iv, 'hex'));
        zip.append(decryptedData, { name: itemPath });
      } catch (err) {
        console.error(`Error appending file ${item.name} to zip:`, err.message);
      }
    }
  }
};

// @desc    List files and folders
// @route   GET /api/files
// @access  Private
router.get('/', protect, async (req, res) => {
  const { 
    parent, 
    search, 
    trash,
    favorite,
    tag,
    mime,
    ext,
    minSize,
    maxSize,
    startDate,
    endDate,
    sortBy,
    sortOrder
  } = req.query;

  try {
    let query = { owner: req.user._id };

    if (trash === 'true') {
      query.isDeleted = true;
    } else {
      query.isDeleted = false;

      const isFilterApplied = search || favorite || tag || mime || ext || minSize || maxSize || startDate || endDate;
      
      if (!isFilterApplied) {
        query.parentFolder = parent && parent !== 'null' ? parent : null;
      } else {
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { tags: { $regex: search, $options: 'i' } },
            { "comments.comment": { $regex: search, $options: 'i' } }
          ];
        }
      }

      if (favorite === 'true') {
        query.isFavorite = true;
      }

      if (tag) {
        query.tags = tag;
      }

      if (mime) {
        query.mimeType = { $regex: mime, $options: 'i' };
      }

      if (ext) {
        query.name = { $regex: `\\.${ext}$`, $options: 'i' };
      }

      if (minSize || maxSize) {
        query.size = {};
        if (minSize) query.size.$gte = Number(minSize);
        if (maxSize) query.size.$lte = Number(maxSize);
      }

      if (startDate || endDate) {
        query.updatedAt = {};
        if (startDate) query.updatedAt.$gte = new Date(startDate);
        if (endDate) query.updatedAt.$lte = new Date(endDate);
      }
    }

    let sortOptions = { isFolder: -1 };
    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'name') {
        sortOptions.name = order;
      } else if (sortBy === 'size') {
        sortOptions.size = order;
      } else if (sortBy === 'date') {
        sortOptions.updatedAt = order;
      }
    } else {
      sortOptions.name = 1;
    }

    const items = await File.find(query).sort(sortOptions);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new folder
// @route   POST /api/files/folder
// @access  Private
router.post('/folder', protect, async (req, res) => {
  const { name, parent } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Folder name is required' });
  }

  const trimmedName = name.trim();
  const invalidChars = /[\/\\?%*:|"<>]/;
  if (invalidChars.test(trimmedName)) {
    return res.status(400).json({ message: 'Folder name contains invalid characters: / \\ ? % * : | " < >' });
  }

  try {
    const parentId = parent && parent !== 'null' ? parent : null;

    // Check if name already exists in this folder (either file or folder)
    const nameExists = await File.findOne({
      name: trimmedName,
      parentFolder: parentId,
      owner: req.user._id,
      isDeleted: false,
    });

    if (nameExists) {
      return res.status(400).json({ message: 'An item with this name already exists in this folder' });
    }

    const newFolder = await File.create({
      name: trimmedName,
      parentFolder: parentId,
      isFolder: true,
      owner: req.user._id,
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'CREATE_FOLDER',
      details: `Created folder: ${name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.status(201).json(newFolder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Upload file(s)
// @route   POST /api/files/upload
// @access  Private
router.post('/upload', protect, upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const { parent } = req.body;
  const parentId = parent && parent !== 'null' ? parent : null;
  const uploadDir = await getUploadDir(req.user._id);

  const uploadedItems = [];

  try {
    let incomingSize = 0;
    for (const file of req.files) {
      incomingSize += file.size;
    }

    const user = await User.findById(req.user._id);
    if (user.storageUsed + incomingSize > user.storageLimit) {
      return res.status(400).json({ message: 'Storage limit exceeded. Delete some files and try again.' });
    }

    for (const file of req.files) {
      // 1. Generate unique file model ID
      const fileId = new mongoose.Types.ObjectId();
      const filename = file.originalname;

      // 2. Encrypt buffer
      const iv = cryptoUtils.generateIv();
      const encryptedData = cryptoUtils.encrypt(file.buffer, iv);

      // 3. Save encrypted file to disk
      const physicalPath = path.join(uploadDir, `${fileId}.enc`);
      await storage.write(physicalPath, encryptedData);

      // 4. Save metadata to DB
      const dbFile = await File.create({
        _id: fileId,
        name: filename,
        parentFolder: parentId,
        isFolder: false,
        size: file.size,
        mimeType: file.mimetype || mimeTypes.lookup(filename) || 'application/octet-stream',
        physicalPath,
        iv: iv.toString('hex'),
        owner: req.user._id,
        ownerId: req.user._id,
        createdBy: req.user._id,
        lastModifiedBy: req.user._id,
        permissions: "Owner-RW",
        visibility: "Private"
      });

      // 5. Create activity log
      await ActivityLog.create({
        user: req.user._id,
        action: 'UPLOAD',
        details: `Uploaded file: ${filename} (${(file.size / 1024).toFixed(1)} KB)`,
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      uploadedItems.push(dbFile);
    }

    user.storageUsed += incomingSize;
    await user.save();

    res.status(201).json(uploadedItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Download a file or directory (zip)
// @route   GET /api/files/download/:id
// @access  Private
router.get('/download/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    if (file.isFolder) {
      // Download directory as zip
      const uploadDir = await getUploadDir(req.user._id);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(res);

      await addFolderToZip(file._id, req.user._id, archive, file.name, uploadDir);

      await ActivityLog.create({
        user: req.user._id,
        action: 'DOWNLOAD',
        details: `Downloaded folder as ZIP: ${file.name}`,
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      archive.finalize();
    } else {
      // Decrypt and stream single file
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);

      const readStream = storage.createReadStream(file.physicalPath);
      const decipher = cryptoUtils.decryptStream(Buffer.from(file.iv, 'hex'));

      // Increment stats
      file.downloadCount = (file.downloadCount || 0) + 1;
      file.lastDownloaded = new Date();
      await file.save();

      await ActivityLog.create({
        user: req.user._id,
        action: 'DOWNLOAD',
        details: `Downloaded file: ${file.name} (Provider: ${file.storageProvider || 'local'})`,
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      await pipeline(
        readStream,
        decipher,
        res
      );
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Preview a file (supports ranges for video/audio streaming)
// @route   GET /api/files/preview/:id
// @access  Private
router.get('/preview/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file || file.isFolder) {
      return res.status(404).json({ message: 'File not found or cannot preview folder' });
    }

    const encryptedData = await storage.read(file.physicalPath);
    const decryptedData = cryptoUtils.decrypt(encryptedData, Buffer.from(file.iv, 'hex'));

    const totalSize = decryptedData.length;
    const range = req.headers.range;

    // Log preview action (once per request, ignoring range polls if possible, but keep it simple)
    if (!range || range.startsWith('bytes=0-')) {
      await ActivityLog.create({
        user: req.user._id,
        action: 'PREVIEW',
        details: `Previewed file: ${file.name}`,
        ipAddress: req.ip || req.connection.remoteAddress,
      });
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.mimeType,
      });

      res.end(decryptedData.subarray(start, end + 1));
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': file.mimeType,
      });
      res.end(decryptedData);
    }
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Rename file or folder
// @route   PUT /api/files/rename/:id
// @access  Private
router.put('/rename/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const trimmedName = name.trim();
  const invalidChars = /[\/\\?%*:|"<>]/;
  if (invalidChars.test(trimmedName)) {
    return res.status(400).json({ message: 'Name contains invalid characters: / \\ ? % * : | " < >' });
  }

  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    // Check if name already exists in the same parent folder (excluding self)
    const nameExists = await File.findOne({
      name: trimmedName,
      parentFolder: file.parentFolder,
      owner: req.user._id,
      isDeleted: false,
      _id: { $ne: id }
    });

    if (nameExists) {
      return res.status(400).json({ message: 'An item with this name already exists in this folder' });
    }

    const oldName = file.name;
    file.name = trimmedName;
    await file.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'RENAME',
      details: `Renamed ${file.isFolder ? 'folder' : 'file'} from "${oldName}" to "${name}"`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Move file/folder to recycle bin (soft delete)
// @route   PUT /api/files/trash/:id
// @access  Private
router.put('/trash/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    await setDeletedStatusRecursive(id, req.user._id, true);

    await ActivityLog.create({
      user: req.user._id,
      action: 'DELETE',
      details: `Moved ${file.isFolder ? 'folder' : 'file'} to Recycle Bin: ${file.name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({ message: 'Moved to Recycle Bin successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Restore file/folder from recycle bin
// @route   PUT /api/files/restore/:id
// @access  Private
router.put('/restore/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    await setDeletedStatusRecursive(id, req.user._id, false);

    await ActivityLog.create({
      user: req.user._id,
      action: 'RESTORE',
      details: `Restored ${file.isFolder ? 'folder' : 'file'} from Recycle Bin: ${file.name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({ message: 'Restored successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Permanently delete a file or folder
// @route   DELETE /api/files/purge/:id
// @access  Private
router.delete('/purge/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    const uploadDir = await getUploadDir(req.user._id);
    const deletedName = file.name;
    const isFolder = file.isFolder;

    const freedSize = await deleteFileOrFolderRecursive(id, req.user._id, uploadDir);

    const user = await User.findById(req.user._id);
    user.storageUsed = Math.max(0, user.storageUsed - freedSize);
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'PURGE',
      details: `Permanently deleted ${isFolder ? 'folder' : 'file'}: ${deletedName}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({ message: 'Permanently deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get storage usage analytics
// @route   GET /api/files/analytics
// @access  Private
router.get('/analytics', protect, async (req, res) => {
  try {
    const allFiles = await File.find({ owner: req.user._id, isFolder: false, isDeleted: false });
    
    let totalSize = 0;
    let categoryBreakdown = {
      images: { count: 0, size: 0 },
      video: { count: 0, size: 0 },
      audio: { count: 0, size: 0 },
      documents: { count: 0, size: 0 },
      archives: { count: 0, size: 0 },
      others: { count: 0, size: 0 },
    };

    allFiles.forEach((file) => {
      totalSize += file.size;
      const mime = file.mimeType.toLowerCase();
      
      if (mime.startsWith('image/')) {
        categoryBreakdown.images.count++;
        categoryBreakdown.images.size += file.size;
      } else if (mime.startsWith('video/')) {
        categoryBreakdown.video.count++;
        categoryBreakdown.video.size += file.size;
      } else if (mime.startsWith('audio/')) {
        categoryBreakdown.audio.count++;
        categoryBreakdown.audio.size += file.size;
      } else if (
        mime.includes('pdf') ||
        mime.includes('document') ||
        mime.includes('sheet') ||
        mime.includes('text') ||
        mime.includes('msword') ||
        mime.includes('powerpoint')
      ) {
        categoryBreakdown.documents.count++;
        categoryBreakdown.documents.size += file.size;
      } else if (
        mime.includes('zip') ||
        mime.includes('rar') ||
        mime.includes('tar') ||
        mime.includes('compressed')
      ) {
        categoryBreakdown.archives.count++;
        categoryBreakdown.archives.size += file.size;
      } else {
        categoryBreakdown.others.count++;
        categoryBreakdown.others.size += file.size;
      }
    });

    const folderCount = await File.countDocuments({ owner: req.user._id, isFolder: true, isDeleted: false });
    const trashCount = await File.countDocuments({ owner: req.user._id, isDeleted: true });

    res.json({
      totalSize,
      fileCount: allFiles.length,
      folderCount,
      trashCount,
      categories: categoryBreakdown,
      storageLimit: req.user.storageLimit,
      storageUsed: req.user.storageUsed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Move file or folder to another folder
// @route   PUT /api/files/move/:id
// @access  Private
router.put('/move/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { parent } = req.body;
  
  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File or folder not found' });
    }
    
    file.parentFolder = parent && parent !== 'null' ? parent : null;
    await file.save();
    
    await ActivityLog.create({
      user: req.user._id,
      action: 'MOVE',
      details: `Moved ${file.isFolder ? 'folder' : 'file'} "${file.name}"`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });
    
    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Copy file or folder
// @route   POST /api/files/copy/:id
// @access  Private
router.post('/copy/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { parent } = req.body;

  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    const getFileOrFolderSize = async (fileId) => {
      const f = await File.findOne({ _id: fileId, owner: req.user._id });
      if (!f) return 0;
      if (f.isFolder) {
        let total = 0;
        const children = await File.find({ parentFolder: fileId, owner: req.user._id, isDeleted: false });
        for (const child of children) {
          total += await getFileOrFolderSize(child._id);
        }
        return total;
      } else {
        let size = f.size;
        if (f.versions) {
          f.versions.forEach(v => { size += v.size; });
        }
        return size;
      }
    };

    const neededSize = await getFileOrFolderSize(id);
    const user = await User.findById(req.user._id);
    if (user.storageUsed + neededSize > user.storageLimit) {
      return res.status(400).json({ message: 'Storage limit exceeded. Cannot copy items.' });
    }

    const uploadDir = await getUploadDir(req.user._id);

    const copyFile = async (srcFile, parentId) => {
      const fileId = new mongoose.Types.ObjectId();
      const physicalPath = path.join(uploadDir, `${fileId}.enc`);
      await storage.copy(srcFile.physicalPath, physicalPath);

      // Copy versions physically too
      const copiedVersions = [];
      if (srcFile.versions && srcFile.versions.length > 0) {
        for (const ver of srcFile.versions) {
          const verId = new mongoose.Types.ObjectId();
          const verPath = path.join(uploadDir, `${verId}.enc`);
          await storage.copy(ver.physicalPath, verPath);
          copiedVersions.push({
            size: ver.size,
            physicalPath: verPath,
            iv: ver.iv,
            createdAt: ver.createdAt
          });
        }
      }

      const newFile = await File.create({
        _id: fileId,
        name: srcFile.name,
        parentFolder: parentId,
        isFolder: false,
        size: srcFile.size,
        mimeType: srcFile.mimeType,
        physicalPath,
        iv: srcFile.iv,
        owner: req.user._id,
        versions: copiedVersions
      });

      return newFile;
    };

    const copyFolderRecursive = async (srcFolder, parentId) => {
      const newFolderId = new mongoose.Types.ObjectId();
      const newFolder = await File.create({
        _id: newFolderId,
        name: srcFolder.name,
        parentFolder: parentId,
        isFolder: true,
        owner: req.user._id,
      });

      const children = await File.find({ parentFolder: srcFolder._id, owner: req.user._id, isDeleted: false });
      for (const child of children) {
        if (child.isFolder) {
          await copyFolderRecursive(child, newFolderId);
        } else {
          await copyFile(child, newFolderId);
        }
      }
      return newFolder;
    };

    let result;
    const parentFolderId = parent && parent !== 'null' ? parent : null;
    if (file.isFolder) {
      result = await copyFolderRecursive(file, parentFolderId);
    } else {
      result = await copyFile(file, parentFolderId);
    }

    user.storageUsed += neededSize;
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'COPY',
      details: `Copied ${file.isFolder ? 'folder' : 'file'} "${file.name}"`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Toggle favorite status
// @route   PUT /api/files/:id/favorite
// @access  Private
router.put('/:id/favorite', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.isFavorite = !file.isFavorite;
    await file.save();

    await ActivityLog.create({
      user: req.user._id,
      action: file.isFavorite ? 'FAVORITE' : 'UNFAVORITE',
      details: `${file.isFavorite ? 'Starred' : 'Unstarred'} "${file.name}"`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add/Update tags of a file
// @route   POST /api/files/:id/tags
// @access  Private
router.post('/:id/tags', protect, async (req, res) => {
  const { tags } = req.body;
  if (!Array.isArray(tags)) {
    return res.status(400).json({ message: 'tags must be an array of strings' });
  }
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const sanitizedTags = tags.map(t => typeof t === 'string' ? t.trim() : '').filter(Boolean);
    file.tags = sanitizedTags;
    await file.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'TAG_UPDATE',
      details: `Updated tags for "${file.name}" to: [${sanitizedTags.join(', ')}]`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add comment to file
// @route   POST /api/files/:id/comments
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  const { comment } = req.body;
  if (!comment) {
    return res.status(400).json({ message: 'comment content is required' });
  }
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.comments.push({
      username: req.user.username,
      comment,
      createdAt: new Date()
    });
    await file.save();
    
    await ActivityLog.create({
      user: req.user._id,
      action: 'COMMENT',
      details: `Commented on "${file.name}"`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create shared link for file
// @route   POST /api/files/:id/share
// @access  Private
router.post('/:id/share', protect, async (req, res) => {
  const { passcode, expiryDate } = req.body;
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const urlCode = Math.random().toString(36).substring(2, 10);
    const newLink = {
      passcode: passcode || "",
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      urlCode,
      createdAt: new Date()
    };
    file.sharedLinks.push(newLink);
    await file.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'SHARE_CREATE',
      details: `Created shared link for "${file.name}"`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json(newLink);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete shared link
// @route   DELETE /api/files/:id/share/:code
// @access  Private
router.delete('/:id/share/:code', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.sharedLinks = file.sharedLinks.filter(l => l.urlCode !== req.params.code);
    await file.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'SHARE_DELETE',
      details: `Revoked/deleted shared link for "${file.name}"`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Upload new version of a file
// @route   POST /api/files/:id/version
// @access  Private
router.post('/:id/version', protect, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file || file.isFolder) {
      return res.status(404).json({ message: 'File not found' });
    }

    const user = await User.findById(req.user._id);
    if (user.storageUsed + req.file.size > user.storageLimit) {
      return res.status(400).json({ message: 'Storage limit exceeded. Cannot upload new version.' });
    }

    const uploadDir = await getUploadDir(req.user._id);
    const originalName = req.file.originalname;

    const iv = cryptoUtils.generateIv();
    const encryptedData = cryptoUtils.encrypt(req.file.buffer, iv);

    const physicalFileName = `${Date.now()}-${originalName}.enc`;
    const physicalPath = path.join(uploadDir, physicalFileName);

    await storage.write(physicalPath, encryptedData);

    file.versions.push({
      size: file.size,
      physicalPath: file.physicalPath,
      iv: file.iv,
      createdAt: file.updatedAt || new Date()
    });

    file.size = req.file.size;
    file.physicalPath = physicalPath;
    file.iv = iv.toString('hex');
    await file.save();

    user.storageUsed += req.file.size;
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'UPLOAD_VERSION',
      details: `Uploaded new version of "${file.name}"`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get statistics for insights
// @route   GET /api/files/stats/insights
// @access  Private
router.get('/stats/insights', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const largestFiles = await File.find({ owner: userId, isFolder: false, isDeleted: false })
      .sort({ size: -1 })
      .limit(6);

    const recentlyModified = await File.find({ owner: userId, isDeleted: false })
      .sort({ updatedAt: -1 })
      .limit(6);

    const allFiles = await File.find({ owner: userId, isDeleted: false });
    const folders = allFiles.filter(f => f.isFolder);
    const getFolderSize = (folderId) => {
      let total = 0;
      const recurse = (id) => {
        const children = allFiles.filter(f => f.parentFolder && f.parentFolder.toString() === id.toString());
        for (const child of children) {
          if (child.isFolder) {
            recurse(child._id);
          } else {
            total += child.size;
          }
        }
      };
      recurse(folderId);
      return total;
    };
    const largestFolders = folders.map(f => ({
      _id: f._id,
      name: f.name,
      size: getFolderSize(f._id)
    })).sort((a, b) => b.size - a.size).slice(0, 6);

    const categories = {
      images: { size: 0, count: 0 },
      videos: { size: 0, count: 0 },
      audio: { size: 0, count: 0 },
      documents: { size: 0, count: 0 },
      archives: { size: 0, count: 0 },
      others: { size: 0, count: 0 }
    };
    for (const f of allFiles) {
      if (f.isFolder) continue;
      const mime = f.mimeType.toLowerCase();
      if (mime.startsWith('image/')) {
        categories.images.size += f.size;
        categories.images.count++;
      } else if (mime.startsWith('video/')) {
        categories.videos.size += f.size;
        categories.videos.count++;
      } else if (mime.startsWith('audio/')) {
        categories.audio.size += f.size;
        categories.audio.count++;
      } else if (
        mime.includes('pdf') ||
        mime.includes('document') ||
        mime.includes('sheet') ||
        mime.includes('text') ||
        mime.includes('msword') ||
        mime.includes('powerpoint')
      ) {
        categories.documents.size += f.size;
        categories.documents.count++;
      } else if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('compressed')) {
        categories.archives.size += f.size;
        categories.archives.count++;
      } else {
        categories.others.size += f.size;
        categories.others.count++;
      }
    }

    const downloadLogs = await ActivityLog.find({ user: userId, action: 'DOWNLOAD' });
    const previewLogs = await ActivityLog.find({ user: userId, action: 'PREVIEW' });

    const getTopLogs = (logs) => {
      const counts = {};
      logs.forEach(l => {
        const fileMatch = l.details.match(/"([^"]+)"/);
        if (fileMatch) {
          const name = fileMatch[1];
          counts[name] = (counts[name] || 0) + 1;
        }
      });
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    };

    const mostDownloaded = getTopLogs(downloadLogs);
    const mostPreviewed = getTopLogs(previewLogs);

    res.json({
      largestFiles,
      largestFolders,
      recentlyModified,
      categories,
      mostDownloaded,
      mostPreviewed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get shared file info by urlCode (Public route)
// @route   GET /api/files/shared/:code
// @access  Public
router.get('/shared/:code', async (req, res) => {
  try {
    const file = await File.findOne({ "sharedLinks.urlCode": req.params.code, isDeleted: false });
    if (!file) {
      return res.status(404).json({ message: 'Shared link not found or expired' });
    }

    const link = file.sharedLinks.find(l => l.urlCode === req.params.code);
    if (link.expiryDate && new Date(link.expiryDate) < new Date()) {
      return res.status(410).json({ message: 'This link has expired' });
    }

    const { passcode } = req.query;
    if (link.passcode && link.passcode !== passcode) {
      return res.status(401).json({ message: 'Incorrect passcode required', passcodeRequired: true });
    }

    res.json({
      _id: file._id,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      isFolder: file.isFolder,
      urlCode: link.urlCode,
      hasPasscode: !!link.passcode,
      expiryDate: link.expiryDate
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Download shared file content (Public route)
// @route   GET /api/files/shared/:code/download
// @access  Public
router.get('/shared/:code/download', async (req, res) => {
  try {
    const file = await File.findOne({ "sharedLinks.urlCode": req.params.code, isDeleted: false });
    if (!file) {
      return res.status(404).json({ message: 'Shared link not found' });
    }

    const link = file.sharedLinks.find(l => l.urlCode === req.params.code);
    if (link.expiryDate && new Date(link.expiryDate) < new Date()) {
      return res.status(410).json({ message: 'This link has expired' });
    }

    const { passcode } = req.query;
    if (link.passcode && link.passcode !== passcode) {
      return res.status(401).json({ message: 'Incorrect passcode required' });
    }

    if (file.isFolder) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}.zip"`);
      const zip = archiver('zip', { zlib: { level: 9 } });
      zip.pipe(res);
      const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
      await addFolderToZip(file._id, file.owner, zip, file.name, uploadDir);
      zip.finalize();
    } else {
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);

      const readStream = storage.createReadStream(file.physicalPath);
      const decipher = cryptoUtils.decryptStream(Buffer.from(file.iv, 'hex'));

      // Increment stats
      file.downloadCount = (file.downloadCount || 0) + 1;
      file.lastDownloaded = new Date();
      await file.save();

      await ActivityLog.create({
        user: file.owner,
        action: 'DOWNLOAD',
        details: `Public shared download: ${file.name} (Provider: ${file.storageProvider || 'local'})`,
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      await pipeline(
        readStream,
        decipher,
        res
      );
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Download historical version of a file
// @route   GET /api/files/download/:id/version/:index
// @access  Private
router.get('/download/:id/version/:index', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file || file.isFolder) {
      return res.status(404).json({ message: 'File not found' });
    }

    const index = parseInt(req.params.index);
    if (isNaN(index) || index < 0 || index >= file.versions.length) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const version = file.versions[index];

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);

    const readStream = storage.createReadStream(version.physicalPath);
    const decipher = cryptoUtils.decryptStream(Buffer.from(version.iv, 'hex'));

    await pipeline(
      readStream,
      decipher,
      res
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Restore historical version of a file
// @route   POST /api/files/:id/version/:index/restore
// @access  Private
router.post('/:id/version/:index/restore', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file || file.isFolder) {
      return res.status(404).json({ message: 'File not found' });
    }

    const index = parseInt(req.params.index);
    if (isNaN(index) || index < 0 || index >= file.versions.length) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const version = file.versions[index];

    const currentPath = file.physicalPath;
    const currentIv = file.iv;
    const currentSize = file.size;

    file.physicalPath = version.physicalPath;
    file.iv = version.iv;
    file.size = version.size;

    file.versions[index] = {
      physicalPath: currentPath,
      iv: currentIv,
      size: currentSize,
      notes: 'Replaced during restore',
      author: req.user._id,
      createdAt: new Date()
    };

    await file.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'RENAME',
      details: `Restored version ${index} of file: ${file.name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({ message: 'Version restored successfully', file });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete historical version of a file
// @route   DELETE /api/files/:id/version/:index
// @access  Private
router.delete('/:id/version/:index', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file || file.isFolder) {
      return res.status(404).json({ message: 'File not found' });
    }

    const index = parseInt(req.params.index);
    if (isNaN(index) || index < 0 || index >= file.versions.length) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const version = file.versions[index];
    try {
      await storage.delete(version.physicalPath);
    } catch (delErr) {
      console.warn('Physical delete failed during version purge:', delErr.message);
    }

    file.versions.splice(index, 1);
    await file.save();

    res.json({ message: 'Version purged successfully', file });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Generate AI Summary for a file
// @route   POST /api/files/:id/ai-summary
// @access  Private
router.post('/:id/ai-summary', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file || file.isFolder) {
      return res.status(404).json({ message: 'File not found' });
    }

    const aiService = require('../services/aiService');
    const summary = await aiService.generateSummary(file._id);

    file.aiSummary = summary;
    await file.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'RENAME',
      details: `Generated AI Summary for file: ${file.name}`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({ message: 'AI Summary generated successfully', summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Perform semantic AI search on files
// @route   GET /api/files/ai-search
// @access  Private
router.get('/ai-search', protect, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }

  try {
    const files = await File.find({
      owner: req.user._id,
      isDeleted: false,
      name: { $regex: q, $options: 'i' }
    });

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Lock a file to prevent concurrency edits
// @route   POST /api/files/:id/lock
// @access  Private
router.post('/:id/lock', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file || file.isFolder) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.lockedBy && file.lockedBy.toString() !== req.user._id.toString()) {
      return res.status(409).json({ message: 'File is already locked by another user' });
    }

    file.lockedBy = req.user._id;
    file.lockTimestamp = new Date();
    await file.save();

    res.json({ message: 'File locked successfully', file });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Unlock a file
// @route   POST /api/files/:id/unlock
// @access  Private
router.post('/:id/unlock', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file || file.isFolder) {
      return res.status(404).json({ message: 'File not found' });
    }

    file.lockedBy = null;
    file.lockTimestamp = null;
    await file.save();

    res.json({ message: 'File unlocked successfully', file });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Resolve sync conflicts
// @route   POST /api/files/:id/sync-resolve
// @access  Private
router.post('/:id/sync-resolve', protect, async (req, res) => {
  const { resolution } = req.body;
  try {
    const syncService = require('../services/syncService');
    const result = await syncService.resolveConflict(req.params.id, resolution, req.user._id);
    res.json({ message: 'Conflict resolved', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
