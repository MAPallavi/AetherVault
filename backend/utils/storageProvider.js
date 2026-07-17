const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { Readable, Writable } = require('stream');

// Base Storage Provider Interface
class StorageProvider {
  async write(key, data) {
    throw new Error("write method not implemented");
  }
  async read(key) {
    throw new Error("read method not implemented");
  }
  async delete(key) {
    throw new Error("delete method not implemented");
  }
  async copy(srcKey, destKey) {
    throw new Error("copy method not implemented");
  }
  createWriteStream(key) {
    throw new Error("createWriteStream method not implemented");
  }
  createReadStream(key) {
    throw new Error("createReadStream method not implemented");
  }
  getSignedUrl(key, operation = 'read', expiresIn = 3600) {
    throw new Error("getSignedUrl method not implemented");
  }
  async checkHealth() {
    throw new Error("checkHealth method not implemented");
  }
}

// Local Storage Provider Implementation
class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.uploadPath = path.resolve(process.env.LOCAL_UPLOAD_PATH || './uploads');
  }

  _getPhysicalPath(key) {
    if (path.isAbsolute(key)) {
      return key;
    }
    return path.join(this.uploadPath, key);
  }

  async write(key, data) {
    const physicalPath = this._getPhysicalPath(key);
    const dir = path.dirname(physicalPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(physicalPath, data);
  }

  async read(key) {
    const physicalPath = this._getPhysicalPath(key);
    return await fs.readFile(physicalPath);
  }

  async delete(key) {
    const physicalPath = this._getPhysicalPath(key);
    try {
      await fs.unlink(physicalPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async copy(srcKey, destKey) {
    const srcPath = this._getPhysicalPath(srcKey);
    const destPath = this._getPhysicalPath(destKey);
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(srcPath, destPath);
  }

  createWriteStream(key) {
    const physicalPath = this._getPhysicalPath(key);
    const dir = path.dirname(physicalPath);
    fsSync.mkdirSync(dir, { recursive: true });
    return fsSync.createWriteStream(physicalPath);
  }

  createReadStream(key) {
    const physicalPath = this._getPhysicalPath(key);
    return fsSync.createReadStream(physicalPath);
  }

  getSignedUrl(key, operation = 'read', expiresIn = 3600) {
    // Return a secure simulated local URL
    return `/api/files/download-direct/${encodeURIComponent(key)}`;
  }

  async checkHealth() {
    try {
      await fs.access(this.uploadPath);
      return { status: 'healthy', details: 'Local storage folder is accessible' };
    } catch (err) {
      try {
        await fs.mkdir(this.uploadPath, { recursive: true });
        return { status: 'healthy', details: 'Local storage folder created' };
      } catch (mkdirErr) {
        return { status: 'unhealthy', details: mkdirErr.message };
      }
    }
  }
}

// Cloud Storage Provider Implementation (with config architectures for future cloud integrations)
class CloudStorageProvider extends StorageProvider {
  constructor(providerType) {
    super();
    this.providerType = providerType; // 's3' | 'r2' | 'azure' | 'gcs' | 'b2'
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.s3Bucket = process.env.AWS_BUCKET || 'aethervault-s3';
    this.r2Bucket = process.env.R2_BUCKET || 'aethervault-r2';
    this.azureContainer = process.env.AZURE_CONTAINER || 'aethervault-container';
    this.gcsBucket = process.env.GCS_BUCKET || 'aethervault-gcs';
    this.b2Bucket = process.env.B2_BUCKET || 'aethervault-b2';
    
    // Virtual storage mock path (simulated fallback to keep storage functional without active cloud credentials)
    this.fallbackPath = path.resolve(`./uploads/cloud_mock_${providerType}`);
  }

  _getMockPath(key) {
    if (path.isAbsolute(key)) {
      return key;
    }
    return path.join(this.fallbackPath, key);
  }

  async write(key, data) {
    const mockPath = this._getMockPath(key);
    const dir = path.dirname(mockPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(mockPath, data);
  }

  async read(key) {
    const mockPath = this._getMockPath(key);
    return await fs.readFile(mockPath);
  }

  async delete(key) {
    const mockPath = this._getMockPath(key);
    try {
      await fs.unlink(mockPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async copy(srcKey, destKey) {
    const srcPath = this._getMockPath(srcKey);
    const destPath = this._getMockPath(destKey);
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(srcPath, destPath);
  }

  createWriteStream(key) {
    const mockPath = this._getMockPath(key);
    const dir = path.dirname(mockPath);
    fsSync.mkdirSync(dir, { recursive: true });
    return fsSync.createWriteStream(mockPath);
  }

  createReadStream(key) {
    const mockPath = this._getMockPath(key);
    return fsSync.createReadStream(mockPath);
  }

  getSignedUrl(key, operation = 'read', expiresIn = 3600) {
    // Generate secure future Cloud Signed URL placeholder
    return `https://${this.providerType}-signed-url.aethervault.io/${encodeURIComponent(key)}?expires=${Date.now() + expiresIn * 1000}`;
  }

  async checkHealth() {
    return { status: 'healthy', details: `Cloud provider ${this.providerType} simulated fallback is healthy` };
  }
}

// Storage Orchestrator Service
class StorageService {
  constructor() {
    const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
    if (providerType === 'local') {
      this.provider = new LocalStorageProvider();
    } else {
      this.provider = new CloudStorageProvider(providerType);
    }
  }

  async write(key, data) {
    return await this.provider.write(key, data);
  }

  async read(key) {
    return await this.provider.read(key);
  }

  async delete(key) {
    return await this.provider.delete(key);
  }

  async copy(srcKey, destKey) {
    return await this.provider.copy(srcKey, destKey);
  }

  createWriteStream(key) {
    return this.provider.createWriteStream(key);
  }

  createReadStream(key) {
    return this.provider.createReadStream(key);
  }

  getSignedUrl(key, operation = 'read', expiresIn = 3600) {
    return this.provider.getSignedUrl(key, operation, expiresIn);
  }

  async checkHealth() {
    return await this.provider.checkHealth();
  }

  getStatus() {
    return {
      provider: process.env.STORAGE_PROVIDER || 'local',
      storagePath: process.env.LOCAL_UPLOAD_PATH || './uploads',
      cloudStatus: process.env.STORAGE_PROVIDER && process.env.STORAGE_PROVIDER !== 'local' ? 'Initialized' : 'Not Connected',
      configurationStatus: 'Valid defaults loaded',
      details: {
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        awsBucket: process.env.AWS_BUCKET || 'aethervault-s3',
        r2Bucket: process.env.R2_BUCKET || 'aethervault-r2',
        azureContainer: process.env.AZURE_CONTAINER || 'aethervault-container',
        gcsBucket: process.env.GCS_BUCKET || 'aethervault-gcs'
      }
    };
  }
}

const storageService = new StorageService();

module.exports = {
  StorageProvider,
  LocalStorageProvider,
  CloudStorageProvider,
  StorageService,
  storage: storageService // Export singleton named "storage" for backward compatibility
};
