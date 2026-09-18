# 🔐 Authentication Guide - Hermes Gateway

> 🇧🇷 **Versão em Português?** [AUTHENTICATION.md](AUTHENTICATION.md)

This document details the two independent authentication systems implemented in the Hermes architecture: **Better Auth** for the administrative console and **Cryptographic API Keys** with automatic rotation for external integrations.

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [User Authentication (Better Auth)](#-user-authentication-better-auth)
3. [Programmatic Authentication (Cryptographic API Keys)](#-programmatic-authentication-cryptographic-api-keys)
4. [Automatic Key Rotation Job](#-automatic-key-rotation-job)
5. [Security & Cryptography](#-security--cryptography)

---

## 🎯 Overview

Hermes adopts a hybrid, decentralized access security model:

| Flow | Audience | Mechanism | Validity | Header / Transport |
| :--- | :--- | :--- | :--- | :--- |
| **Web Console** | Users / Admins | Better Auth (Cookies/Sessions) | Dynamic | HTTPOnly Cookies / `Authorization: Bearer <token>` |
| **Client API** | Integrated Applications | Indexed API Key (Argon2id) | Configurable | Header `X-API-Key: hm_prefix.secret` |

---

## 🔑 User Authentication (Better Auth)

The administrative console (`hermes-front`) communicates with the `hermes-api` using the **Better Auth** library.

### 1. Database Structure (PostgreSQL)

Session integrity is maintained through four relational tables managed by the Drizzle adapter:

- **`user`:** Stores the user's profile (name, email, hashed password, image, and `is_admin` flag).
- **`account`:** Stores authentication providers linked to the user (e.g., local credentials or Google login).
- **`session`:** Stores active session tokens, IP addresses, and browser User-Agents.
- **`verification`:** Stores temporary verification tokens (e.g., for password reset flows).

### 2. Google OAuth2 Flow

Better Auth is configured with the social providers plugin to support **Google Sign-In**.

- The frontend initiates login by redirecting to `/api/auth/login/social/google`.
- Better Auth validates the user's Google session and creates a record in the `account` table and a new linked `session` in PostgreSQL.

### 3. Authenticated Request Example

For requests that do not use automatic cookies, the frontend sends the Better Auth Bearer Token (enabled via the `bearer` plugin on the backend):

```http
GET /api/services HTTP/1.1
Host: localhost:3001
Authorization: Bearer [SESSION_TOKEN]
```

---

## 🔐 Programmatic Authentication (Cryptographic API Keys)

For integrating external systems (e.g., a news portal that sends welcome emails), authentication is handled via **API Keys**.

### 1. API Key Structure

Hermes keys are composed of two parts separated by a period (`.`):

```
hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f...
└─────┬───┘ └──────────────────────┬──────────────────────┘
      │                            │ Random Secret (32 bytes in HEX - 64 characters)
      └ Public Prefix (8 HEX characters) for fast database lookup
```

### 2. Efficient & Secure Validation (Argon2id)

To prevent brute-force attacks, timing attacks, and database leaks, Hermes implements a hybrid validation process:

1. **Prefix Indexing:** The database stores the `prefix` in plain text with a unique index. When a request with the full key arrives, the `requireApiKey` middleware splits the key and queries only entries where the prefix matches, reducing complexity from `O(N)` to `O(1)`.
2. **Strong Hash Verification:** With the candidate key retrieved, the system runs **Argon2** (`argon2.verify()`) to confirm the key's secret matches the stored hash. Argon2id is resistant to parallel hardware attacks (GPU/ASIC).

```
Request (Header X-API-Key: hm_b5c92a10.secret)
                  │
                  ▼
         [requireApiKey Middleware]
                  │
                  ├──► 1. Extract prefix: "hm_b5c92a10"
                  │
                  ├──► 2. SQL: SELECT ... FROM credential
                  │         WHERE prefix = 'hm_b5c92a10'
                  │           AND is_active = true
                  │           AND deleted_at IS NULL
                  │
                  ▼
         [Candidate Key Found?]
                  │
                  ├──► NO: Return 401 Unauthorized
                  │
                  ▼
         [argon2.verify(key_hash, received_key)]
                  │
                  ├──► FAILED: Return 401 Unauthorized
                  │
                  ▼
         [Check Validity (expiresAt)]
                  │
                  ├──► Expired: Return 401 (API_KEY_EXPIRED)
                  │
                  ▼
         Inject req.serviceId and req.credentialId, then call next()
```

### 3. Programmatic Request Example (Email Sending)

> **Note:** The email sending route via API Key is `POST /api/emails` (without a serviceId in the path). The serviceId and credentialId are identified automatically by the middleware from the API Key.

**Request:**
```http
POST /api/emails HTTP/1.1
Host: localhost:3001
X-API-Key: hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f
Content-Type: application/json

{
  "recipient_to": "customer@email.com",
  "subject": "Registration Confirmation",
  "template_id": "cltmplxxxxxx0000xxxx",
  "variables": {
    "name": "John Doe",
    "link": "https://example.com"
  }
}
```

**Response (201 Created):**
```json
{
  "error": false,
  "code": 201,
  "message": "E-mail enfileirado com sucesso!",
  "data": {
    "id": "clemailxxxxxx0000xxxx",
    "status": "pending",
    "recipient_to": "customer@email.com"
  },
  "errors": []
}
```

---

## 🔄 Automatic Key Rotation Job

The API Key lifecycle is closely monitored by a cron job executed in a distributed manner by **BullMQ/Redis**, running daily at midnight (`0 0 * * *`), started by `system.ts`.

### 1. Scan and Scheduling

The master job (`api-key-rotation`) queries all active credentials with a non-null `expiresAt`. For each one whose service has `auto_rotate = true` and a configured `webhook_url`, it checks whether the expiry date falls within the threshold (`rotate_threshold_days`, default: 3 days). If so, it enqueues a `rotate-single-key` micro-job.

### 2. Individual Rotation with Retries

The `rotate-single-key` micro-job executes the full rotation cycle for a single credential:

1. **New Key Generation:** Generates a new secure key (format `hm_[prefix].[secret]`, Argon2id hash).
2. **Webhook First:** Attempts to deliver the new key to the service's `webhook_url` via a signed HTTPS `POST`. **If the webhook fails, the database is not modified** - BullMQ schedules a retry with exponential backoff (up to 3 times), ensuring the client never loses access.
3. **Database Update:** Only after webhook confirmation, the database is updated with the new key (`key_hash`, `prefix`, `expiresAt`).
4. **Panel Notification:** A notification is created in the database reporting the result (success or failure).

### 3. Webhook Security (HMAC SHA-256 Signature)

To ensure the webhook genuinely originated from Hermes, the HTTP payload is digitally signed:

- The payload includes the `X-Hermes-Signature` header.
- The signature is generated by computing the HMAC SHA-256 of the JSON-serialized request body using the service's private key (`webhook_secret`):

```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

The payload sent in the webhook contains:
```json
{
  "serviceId": "...",
  "credentialId": "...",
  "newApiKey": "hm_...",
  "rotatedAt": "2026-09-18T00:00:00.000Z",
  "expiresAt": "2026-10-18T00:00:00.000Z"
}
```

---

## 🔒 Security & Cryptography

Sensitive credentials stored in Hermes are protected in the database against leaks through symmetric encryption.

### 1. AES-256-GCM Algorithm

Fields such as `passkey` (SMTP password) and `refresh_token` (Google OAuth2) are stored in the following format:

```
iv_in_hexadecimal:auth_tag_in_hexadecimal:encrypted_payload_in_hexadecimal
```

- **IV (Initialization Vector):** Ensures the same plaintext produces different ciphertexts on each write.
- **Auth Tag:** Guarantees data authenticity, preventing tampering with the encrypted payload.
- **Master Key (`MASTER_KEY`):** A server environment variable used as the derivation key. It never leaves the server.

---

This security system ensures that even if the PostgreSQL database is exposed, production SMTP credentials remain unreadable and active API keys cannot be reverse-engineered or used without the original secret.
