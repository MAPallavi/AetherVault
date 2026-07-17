# Production Deployment Guide

Guide to deploying AetherVault to production environments.

## Docker Containers
Start the multi-tenant stack using:
```bash
docker-compose up --build -d
```

## Cloud Deployments
*   **Render**: Deploy static assets using `dist` folders and bind Express backends.
*   **Railway**: Deploy backend services directly from Git commit history.
*   **Nginx configuration**: Reverse proxy incoming traffic through static routes:
    ```nginx
    location /api {
        proxy_pass http://localhost:5000;
    }
    ```
