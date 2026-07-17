# Environment Configuration Reference

Configuration keys list:

*   `PORT` - Server API port (defaults to `5000`)
*   `NODE_ENV` - Options: `production`, `development`
*   `MONGODB_URI` - MongoDB link
*   `JWT_SECRET` - JWT token secret key
*   `ENCRYPTION_SECRET` - 32-byte key for AES-256 ciphers

*   `STORAGE_PROVIDER` - Options: `local`, `s3`, `r2`, `azure`, `gcs`
*   `LOCAL_UPLOAD_PATH` - Root upload directory
*   `AWS_REGION` - Target AWS region
*   `AWS_BUCKET` - AWS bucket name
