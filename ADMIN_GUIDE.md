# AetherVault Administrator Guide

Operational instructions for system administrators.

## Core Admin Tasks
1.  **Status Monitoring**: Review system statistics (disk size, user count, active cloud provider type) via the Admin Panel tab in Settings.
2.  **Backups**: Execute database dumps and directory file backups using the configured `backupService`.
3.  **Engine Switching**: Switch storage engines (Local, S3, R2, GCS) securely via backend `.env` variables without redeploying code.
