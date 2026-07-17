# API Reference

Detailed list of backend API routes.

## 1. Authentication
*   `POST /api/auth/register` - Create user profile
*   `POST /api/auth/login` - Authenticate profile and receive JWT token
*   `GET /api/auth/me` - Overview profile details

## 2. File Actions
*   `GET /api/files` - List available file and folder objects
*   `POST /api/files/upload` - Stream and encrypt file uploads
*   `GET /api/files/download/:id` - Fetch file decryption stream
*   `POST /api/files/:id/lock` - Prevent multi-user editing overrides
*   `POST /api/files/:id/unlock` - Release editing permissions

## 3. Workspaces & Collaboration
*   `GET /api/collaboration/workspaces` - Retrieve collaborative space models
*   `POST /api/collaboration/invitations` - Create invitations
