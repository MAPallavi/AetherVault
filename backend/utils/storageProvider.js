const fs = require('fs').promises;
const path = require('path');

// Base Storage Provider Interface
class StorageProvider {
  async write(filePath, data) {
    throw new Error("write method not implemented");
  }
  async read(filePath) {
    throw new Error("read method not implemented");
  }
  async delete(filePath) {
    throw new Error("delete method not implemented");
  }
  async copy(srcPath, destPath) {
    throw new Error("copy method not implemented");
  }
}

// Local Storage Provider Implementation
class LocalStorageProvider extends StorageProvider {
  async write(filePath, data) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async read(filePath) {
    return await fs.readFile(filePath);
  }

  async delete(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async copy(srcPath, destPath) {
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(srcPath, destPath);
  }
}

// Factory to resolve configured provider (e.g. from environment config)
const getStorageProvider = () => {
  const providerType = process.env.STORAGE_PROVIDER || 'local';
  if (providerType === 'local') {
    return new LocalStorageProvider();
  }
  // In the future: return new CloudStorageProvider()
  return new LocalStorageProvider();
};

module.exports = {
  StorageProvider,
  LocalStorageProvider,
  storage: getStorageProvider()
};
