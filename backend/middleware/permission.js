const Permission = require('../models/Permission');
const File = require('../models/File');

const checkPermission = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const fileId = req.params.id || req.body.fileId || req.query.fileId;
      if (!fileId) {
        return res.status(400).json({ message: 'File ID is required' });
      }

      const file = await File.findById(fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Owners always have access
      if (file.owner.toString() === req.user._id.toString()) {
        req.fileAccess = 'Owner';
        return next();
      }

      // Look up permission record
      const permission = await Permission.findOne({
        file: fileId,
        user: req.user._id
      });

      if (!permission) {
        return res.status(403).json({ message: 'Access denied: No sharing permissions' });
      }

      const rolesHierarchy = {
        'Owner': 5,
        'Editor': 4,
        'Viewer': 3,
        'Comment Only': 2,
        'Read Only': 1
      };

      const requiredLevel = rolesHierarchy[requiredRole] || 1;
      const userLevel = rolesHierarchy[permission.role] || 1;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ message: 'Access denied: Insufficient permission' });
      }

      req.fileAccess = permission.role;
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
};

module.exports = { checkPermission };
