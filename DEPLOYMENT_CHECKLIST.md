# Public Deployment Checklist for AetherVault

This checklist guides the configuration and deployment of AetherVault to production cloud servers.

## 1. MongoDB Atlas Setup
- [ ] Register/Login to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
- [ ] Create a new Database Cluster (Shared Tier or Dedicated).
- [ ] Add a database user with read/write privileges.
- [ ] Configure IP Access List (allow all `0.0.0.0/0` or specify backend server static IPs).
- [ ] Copy the standard Connection String URI (e.g. `mongodb+srv://<user>:<password>@cluster.mongodb.net/vault`).

## 2. Cloud Storage Provider Setup (Optional)
- [ ] Configure AWS S3, Cloudflare R2, Azure Blob, or Google Cloud Storage bucket.
- [ ] Acquire access keys and set CORS settings to accept incoming domain headers.
- [ ] Set `STORAGE_PROVIDER` environment configuration to match.

## 3. Environment Variables (.env)
- [ ] `PORT` = `5000`
- [ ] `NODE_ENV` = `production`
- [ ] `MONGODB_URI` = `mongodb+srv://...` (Atlas string)
- [ ] `JWT_SECRET` = `[Random Secure String]`
- [ ] `ENCRYPTION_SECRET` = `[64 hex characters]`

## 4. Backend Application Deployment
- [ ] Deploy to Render, Railway, or AWS EC2 using [Dockerfile](file:///c:/Users/DELL/Desktop/My%20file%20manager/backend/Dockerfile).
- [ ] Expose Port `5000` and map health endpoints (`/api/health/liveness` & `/api/health/readiness`).

## 5. Frontend & Domain Configuration
- [ ] Build static index package via `npm run build`.
- [ ] Deploy static dist artifacts using [nginx.conf](file:///c:/Users/DELL/Desktop/My%20file%20manager/frontend/nginx.conf) reverse proxy settings.
- [ ] Map custom domains and bind SSL/HTTPS certificates.

## 6. Verification
- [ ] Verify `GET /api/health/liveness` returns `HTTP 200`.
- [ ] Verify file upload ciphers and download streams process correctly.
