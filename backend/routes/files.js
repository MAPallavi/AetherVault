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

// Multer in-memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB file size limit
});

// Helper to ensure upload directory exists
const getUploadDir = async () => {
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
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
  if (!file) return;

  if (file.isFolder) {
    const children = await File.find({ parentFolder: fileId, owner: userId });
    for (const child of children) {
      await deleteFileOrFolderRecursive(child._id, userId, uploadDir);
    }
  } else {
    // Delete physical file from disk
    if (file.physicalPath) {
      try {
        await fs.unlink(file.physicalPath);
      } catch (err) {
        // Log error but continue deleting from database
        console.error(`Error deleting physical file ${file.physicalPath}:`, err.message);
      }
    }
  }

  // Delete from DB
  await File.deleteOne({ _id: fileId });
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
        const encryptedData = await fs.readFile(item.physicalPath);
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
  const { parent, search, trash } = req.query;

  try {
    let query = { owner: req.user._id };

    if (trash === 'true') {
      // In trash view, show all deleted files/folders belonging to the user
      query.isDeleted = true;
    } else {
      query.isDeleted = false;

      if (search) {
        // Global text search across non-deleted files
        query.name = { $regex: search, $options: 'i' };
      } else {
        // Standard folder navigation
        query.parentFolder = parent && parent !== 'null' ? parent : null;
      }
    }

    const items = await File.find(query).sort({ isFolder: -1, name: 1 });
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

  if (!name) {
    return res.status(400).json({ message: 'Folder name is required' });
  }

  try {
    const parentId = parent && parent !== 'null' ? parent : null;

    // Check if name already exists in this folder
    const folderExists = await File.findOne({
      name,
      parentFolder: parentId,
      owner: req.user._id,
      isFolder: true,
      isDeleted: false,
    });

    if (folderExists) {
      return res.status(400).json({ message: 'A folder with this name already exists' });
    }

    const newFolder = await File.create({
      name,
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
  const uploadDir = await getUploadDir();

  const uploadedItems = [];

  try {
    for (const file of req.files) {
      // 1. Generate unique file model ID
      const fileId = new mongoose.Types.ObjectId();
      const filename = file.originalname;

      // 2. Encrypt buffer
      const iv = cryptoUtils.generateIv();
      const encryptedData = cryptoUtils.encrypt(file.buffer, iv);

      // 3. Save encrypted file to disk
      const physicalPath = path.join(uploadDir, `${fileId}.enc`);
      await fs.writeFile(physicalPath, encryptedData);

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
      const uploadDir = await getUploadDir();
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
      const encryptedData = await fs.readFile(file.physicalPath);
      const decryptedData = cryptoUtils.decrypt(encryptedData, Buffer.from(file.iv, 'hex'));

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.setHeader('Content-Length', decryptedData.length);

      await ActivityLog.create({
        user: req.user._id,
        action: 'DOWNLOAD',
        details: `Downloaded file: ${file.name}`,
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      res.send(decryptedData);
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

    const encryptedData = await fs.readFile(file.physicalPath);
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

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const file = await File.findOne({ _id: id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    const oldName = file.name;
    file.name = name;
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

    const uploadDir = await getUploadDir();
    const deletedName = file.name;
    const isFolder = file.isFolder;

    await deleteFileOrFolderRecursive(id, req.user._id, uploadDir);

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
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
