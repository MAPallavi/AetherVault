# System Architecture Design

## Architecture Overview
AetherVault is structured into isolated layers separating the database models, API gateways, storage wrappers, and background worker queues.

```mermaid
graph TD
  User[Vite React Client] -->|HTTPS| Proxy[Nginx Proxy]
  Proxy -->|REST API| Server[Express API Server]
  Server -->|Metadata| DB[(MongoDB Atlas)]
  Server -->|Encrypted IO Streams| Storage[Storage Service]
  Storage -->|Local Drive| Local[LocalStorageProvider]
  Storage -->|Bucket API| S3[Cloud Providers S3/R2/GCS]
```

## Key Layers
*   **API Routing & Security Gateways**: Restricts endpoints using JWT token parsers and express rate limit constraints.
*   **Encrypted IO Pipeline**: Pipes file streams directly through AES-256 ciphers to the designated storage provider.
*   **Job Services**: Dispatches non-blocking async tasks (scaling thumbnails, scanning viruses).
