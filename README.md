# AetherVault - Secure Personal File Manager

AetherVault is a production-ready, self-hosted personal file manager designed to give you secure access to your files from any laptop or device, keeping everything private and encrypted. It leverages a modern React frontend and a Node.js Express API connected to MongoDB.

## Key Features

- 🔒 **AES-256 Encrypted File Storage**: Every file is encrypted at rest using AES-256 (CBC mode) with unique initialization vectors (IVs) immediately upon upload. Files are decrypted on-the-fly when streamed or downloaded.
- 📂 **Virtual File System**: Standard directory layout allowing nested folders, renaming, and searching.
- 📦 **Directory ZIP Downloads**: Download any virtual directory instantly as a bundled ZIP archive.
- ♻️ **Recycle Bin**: Safely delete files and folders with options to restore them or permanently purge them.
- 📊 **Storage Analytics**: Floating and static dashboard stats showing metrics (space used, files, folders) and category distribution using pure vector SVGs.
- 📝 **Activity Auditing**: Logs of logins, uploads, downloads, renames, previews, and deletes with timestamp and IP address metrics.
- 📺 **Multimedia Previews**: Full inline player support for audio/video, image viewers, PDF documents, and readable text/code files (supporting HTML5 HTTP Range queries for streaming media).
- 🐋 **Docker Containerization**: Simple single-command setup combining Nginx, Node.js API, and MongoDB container instances.

---

## Security Architecture

```text
Upload:   Client -> Express (Memory Storage) -> AES-256-CBC Encrypt -> Disk Write (.enc)
Download: Client <- Express (Stream Decrypt) <- AES-256-CBC Decrypt <- Disk Read (.enc)
```

1. **Memory Buffering**: Multer stores file chunks in-memory rather than temporarily writing unencrypted data blocks onto the disk.
2. **AES-256 Encryption**: Node's native `crypto` module runs `createCipheriv` using a master secret (`ENCRYPTION_SECRET`) and a cryptographically random 16-byte Initialization Vector (`iv`) generated for each file.
3. **Database Security**: Only metadata (original name, file size, mimeType, virtual folder hierarchy, and the unique file `iv`) is stored in the MongoDB collection. The actual file data is binary junk on the disk.
4. **JWT Authentication**: All requests require a `Bearer <token>` header, verified against database records. For streaming tags (like `<video>`), tokens can be securely passed as a query string parameter (`?token=...`).

---

## Deployment & Setup

### Method 1: Docker Compose (Recommended)

Make sure you have [Docker](https://www.docker.com/) installed, then run the following in the project root:

```bash
docker compose up -d
```

This spins up:
- **Frontend** on `http://localhost:80` (served by Nginx, reverse proxying `/api` requests).
- **Backend** API on `http://localhost:5000`.
- **MongoDB** on port `27017` (using a persistent Docker volume).

### Method 2: Manual Local Setup

#### 1. Setup MongoDB
Ensure a local instance of MongoDB is running at `mongodb://localhost:27017/file-manager` or set your custom URI.

#### 2. Start the Backend API
1. Navigate to `/backend`.
2. Create your configuration: `cp .env.example .env` and adjust secrets.
3. Install dependencies: `npm install` (or `npm ci`).
4. Launch the server in development mode: `npm run dev` or production `npm start`.

#### 3. Start the React Frontend
1. Navigate to `/frontend`.
2. Install dependencies: `npm install` (or `npm ci`).
3. Run local dev server: `npm run dev` (starts on `http://localhost:3000`).

---

## Configuration Variables (`backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port that the Node server binds to | `5000` |
| `MONGODB_URI` | The connection string for your MongoDB database | `mongodb://127.0.0.1:27017/file-manager` |
| `JWT_SECRET` | Secret key used for signing session JWT tokens | *User custom string* |
| `ENCRYPTION_SECRET` | Hex string representing a 32-byte key for AES-256 encryption | *User custom string (64 characters)* |
| `UPLOAD_DIR` | The destination folder on disk for saving encrypted files | `./uploads` |

---

## Running Automated Tests

A automated unit and API integration testing suite is configured using **Jest** and **Supertest**. Tests mock out the database connection and schemas to enable clean, sandbox execution:

```bash
# In /backend directory
npm test
```

A CI pipeline is set up in `.github/workflows/test.yml` to automatically verify these tests on code commits.
