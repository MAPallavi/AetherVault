# Security Model & Policy

AetherVault implements a multi-tenant security architecture.

## 1. File Encryption
*   **AES-256-CBC blocks**: Encrypts files dynamically using a server-managed secret cipher key and randomized IV salts.
*   **Checksum Verification**: Detects metadata modification automatically.

## 2. API Hardening
*   **Rate Limiting**: Enforces strict request throttlers in production clusters.
*   **Sanitization**: Scrubs query paths and blocks dangerous executable extensions (`.exe`, `.bat`, `.sh`, `.cmd`, `.msi`, `.vbs`).
*   **Helmet & CSP**: Restricts execution of untrusted cross-origin script assets.
