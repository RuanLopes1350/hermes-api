# 🕊️ Hermes - Transactional Email Gateway

> 🇧🇷 **Versão em Português?** [README.md](README.md)

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2+-red.svg)](https://expressjs.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle--ORM-0.45+-yellowgreen.svg)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-alpine-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

**A professional and scalable transactional email gateway with multi-service support, dynamic MJML templates, an asynchronous processing queue, and a modern admin dashboard.**

[📖 Tutorial](TUTORIAL.en.md) • [🔐 Authentication](AUTHENTICATION.en.md) • [Hermes Front](https://github.com/RuanLopes1350/hermes-front) • [Hermes Client (NPM)](https://github.com/RuanLopes1350/hermes-client)

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [System Architecture](#️-system-architecture)
- [Key Features](#-key-features)
- [Technologies](#️-technologies)
- [Repository Structure](#-repository-structure)
- [Environment Variables](#-environment-variables)
- [Getting Started (Local Development)](#-getting-started-local-development)
- [Available Scripts](#-available-scripts)
- [Security](#-security)

---

## 🎯 About the Project

**Hermes** is an evolution of a personal project (`mailsender`), designed to act as a **centralized transactional email gateway** for organizational or academic infrastructures (such as IFRO - Vilhena, Brazil).

Unlike legacy monolithic solutions, Hermes separates business logic and email delivery into a **Node.js/TypeScript REST API** connected to an **asynchronous Worker (BullMQ/Redis)**. The ecosystem also includes:

- An administrative interface built with **Next.js** for complete management of services, SMTP credentials, and MJML templates.
- The **`hermes-client`**, an official TypeScript SDK for simplified integration with automatic API Key rotation.

---

## ⚙️ System Architecture

The Hermes ecosystem is composed of four main blocks:

```
 ┌────────────────────────────────────────────────────────────────────┐
 │              CLIENT APPLICATIONS (hermes-client SDK)               │
 │       News Portal, Academic System, Any Node.js Application        │
 └────────────────────────────────────┬───────────────────────────────┘
     (POST /api/emails + X-API-Key)   │   (Key Rotation Webhook)
                                      ▼
                   ┌─────────────────────────────────────┐
                   │          HERMES FRONTEND            │
                   │     Admin Dashboard (React/Next)    │
                   └───────┬──────────────────────▲──────┘
         (Cookie Session / │                      │ (Server-Sent Events -
            Bearer Token)  ▼                      │  Real-Time Updates)
                   ┌──────────────────────────────┴──────┐
                   │             HERMES API              │
                   │         Express REST Gateway        │
                   └──────┬───────────────────────┬──────┘
                          │                       │
     (Records email as    │                       │ (Enqueues Redis Job &
        'pending')        ▼                       ▼  fires SSE Event)
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │        POSTGRES DB        │           │        REDIS CACHE        │
    │  Persistence (Drizzle)    │           │   Email Queue / Jobs      │
    └───────────────────────────┘           └─────────────┬─────────────┘
                                                          │
                                                          ▼
                                            ┌───────────────────────────┐
                                            │       HERMES WORKER       │
                                            │   Background Email Job    │
                                            └─────────────┬─────────────┘
                                                          │ (Email Delivery)
                                                          ▼
                                            ┌───────────────────────────┐
                                            │        SMTP SERVER        │
                                            │ (Gmail Plain / XOAUTH2)   │
                                            └───────────────────────────┘
```

---

## ✨ Key Features

### 🏢 Multi-Service (Multi-Tenant)
- Logical data isolation per **Service** (registered namespaces/applications).
- Each service has fully independent API keys, templates, email logs, and security settings.

### 🔑 Smart & Secure API Keys
- Authentication via `X-API-Key` header.
- Keys generated in the format `hm_[public_prefix].[random_secret]`.
- Secure one-way storage using **Argon2id** hashing (resistant to brute-force and timing attacks).
- Fast indexing in PostgreSQL via the 8-character hex public prefix.
- **Automatic Rotation:** A daily BullMQ job monitors expiry dates and rotates keys transparently.
- **Signed Webhooks:** HMAC SHA-256 signed payloads notify integrated systems of upcoming key rotations.

### 📧 Dynamic SMTP & Google OAuth2
- Support for multiple senders and SMTP servers.
- Traditional SMTP authentication (plain password or App Password encrypted with AES-256-GCM).
- **Google OAuth2 (Gmail API):** Authorize and revoke email sending access directly from the admin panel; tokens are renewed dynamically in the background by the Worker.

### 🎨 MJML Templates with Monaco Editor
- Fully responsive emails using **MJML** templates.
- Dynamic variable injection with **Handlebars** (`{{name}}`).
- Built-in editor in the Frontend with live preview.

### 📦 Official SDK (`hermes-client`)
- NPM package `@ruanlopes1350/hermes-client` with a **fluent interface (Builder pattern)**.
- **Zero-downtime API Key Rotation:** Plug-and-play middleware for Express, Next.js, and Fastify.
- Swappable **Storage Adapters** (`MemoryAdapter`, `EnvAdapter`, or custom) to persist keys across restarts.

### ⚡ Real-Time & High Performance
- **Server-Sent Events (SSE):** Email status and dashboard metrics updated in real time.
- **Throttling/Debounce Engine:** Redis Pub/Sub events are batched and dispatched at a controlled rate (max 2 updates/second).
- **BullMQ Queue:** Configurable exponential retries, worker concurrency, and job delays.
- **Worker Auto-scaling:** The `scaler.ts` module detects CPU/RAM load and dynamically adjusts the number of Worker replicas via Docker Compose.

---

## 🛠️ Technologies

### Backend (`hermes-api` & Workers)

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | Runtime platform |
| **TypeScript** | 5.9 | Static typing |
| **Express** | 5.2 | HTTP server / REST API |
| **Drizzle ORM** | 0.45 | ORM and migrations |
| **PostgreSQL** | 15 | Relational database |
| **Redis** | Alpine | Job queue and cache |
| **BullMQ** | 5 | Async queues and workers |
| **Better Auth** | 1.5 | User authentication |
| **Nodemailer** | 8 | Email delivery via SMTP |
| **Google APIs** | - | OAuth2 (Gmail API) |
| **MJML** | 4.18 | Responsive email templates |
| **Handlebars** | 4.7 | Template engine (variables) |
| **Argon2** | - | API Key hashing |
| **Node Crypto** | - | AES-256-GCM (SMTP passwords) |

---

## 📁 Repository Structure

```
hermes-api/
├── src/
│   ├── config/             # Database (Drizzle/Postgres) and Redis configuration
│   ├── controller/         # Express route controllers
│   ├── docs/               # Swagger documentation (generated via npm run docs:generate)
│   ├── middlewares/        # API Key validation, rate limiting, error handling
│   ├── queue/              # BullMQ queues and workers
│   │   ├── emailQueue.ts   # Email queue definition
│   │   ├── emailWorker.ts  # Email sending worker
│   │   ├── systemWorker.ts # System task worker (key rotation, etc.)
│   │   └── queueEvents.ts  # Queue event listeners (SSE bridge)
│   ├── repository/         # Structured SQL queries (Drizzle)
│   ├── routes/             # Application endpoints
│   ├── seeds/              # Development data seed scripts
│   ├── service/            # Core business logic
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Helpers for crypto, auth, and rendering
│   ├── server.ts           # REST API entry point
│   ├── worker.ts           # Email Worker entry point
│   ├── system.ts           # System Worker entry point (scheduled jobs)
│   └── scaler.ts           # Worker auto-scaling via Docker Compose
├── drizzle/                # Migrations generated by Drizzle Kit
├── docker-compose.yml      # Full orchestration (Postgres, Redis, API, Worker, Scaler)
├── dockerfile              # Multi-stage Dockerfile for production
└── .env.example            # Environment variables template
```

> **Note:** The `docker-compose.yml` orchestrates all services in production. For local development, use `docker compose up -d db redis` to start only **Postgres** and **Redis**, then run the API and Worker directly with `npm run dev:api` and `npm run dev:worker`.

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Required |
|---|---|---|
| `PORT` | API port (default: `3001`) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_HOST` / `REDIS_PORT` | Redis address | Yes |
| `AUTH_SECRET` | Better Auth secret (32+ chars) | Yes |
| `AUTH_BASE_URL` | API base URL (e.g., `http://localhost:3001`) | Yes |
| `AUTH_TRUSTED_ORIGINS` | Allowed origins for CORS/Auth (e.g., `http://localhost:3000`) | Yes |
| `MASTER_KEY` | AES-256-GCM master key for encryption | Yes |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin user credentials (read at server startup) | Yes |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth2 credentials | Optional |
| `MAX_WORKERS_OVERRIDE` | Manually cap the Worker replica count | Optional |

---

## 🚀 Getting Started (Local Development)

Make sure you have **Docker**, **Docker Compose**, and **Node.js v20+** installed.

### 1. Configure environment variables
```bash
cd hermes-api
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start the infrastructure (Postgres + Redis only)
```bash
docker compose up -d db redis
```

### 3. Apply the schema

```bash
npm run db:push   # Apply the schema via Drizzle
```

### 4. (Optional) Seed the database with demo data

> **⚠️ Warning:** `npm run seed` **deletes all existing data** (TRUNCATE CASCADE) and repopulates the database with demo users, services, templates, and emails. Only run this if you want a pre-filled development environment. **Only works with `NODE_ENV=development`.**

```bash
npm run seed
```

After seeding, the following logins are available (password: `password123`):
- **Super Admin:** `admin@hermes.com`
- **Admin:** `bruno.tavares@hermes.com`
- **User:** `user@hermes.com`

### 5. Start the API and Workers (separate terminals)
```bash
# Terminal 1 - REST API (port defined in PORT env var):
npm run dev:api

# Terminal 2 - Email Worker:
npm run dev:worker

# Terminal 3 (optional) - System Worker (scheduled jobs: key rotation):
# npm run start:system-worker
```

### 6. Start the Frontend
```bash
cd ../hermes-front
cp .env.example .env
# Edit .env: NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev
# Open http://localhost:3000
```

> For a complete walkthrough, see the [📖 Tutorial](TUTORIAL.en.md).

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev:api` | Start the API in watch mode (tsx) |
| `npm run dev:worker` | Start the Email Worker in watch mode |
| `npm run build` | Generate Swagger docs and compile TypeScript |
| `npm run start:api` | Start the compiled API (production) |
| `npm run start:worker` | Start the compiled Worker (production) |
| `npm run start:system-worker` | Start the System Worker (scheduled jobs) |
| `npm run start:scaler` | Start the auto-scaling module |
| `npm run seed` | Seed demo data **[development only - deletes all data!]** |
| `npm run db:push` | Apply the schema to the database (Drizzle) |
| `npm run db:generate` | Generate migrations from the schema |
| `npm run db:studio` | Open Drizzle Studio (database UI) |
| `npm run db:up` | Start all services via Docker Compose |
| `npm run db:down` | Stop and remove containers |
| `npm run docs:generate` | Generate the `swagger-output.json` file |
| `npm run format:fix` | Format code with Prettier |

---

## 🔒 Security

Hermes implements security best practices for microservices:

1. **SMTP Password Encryption:** Passwords and Google OAuth2 refresh tokens are stored with **AES-256-GCM**, using a master key (`MASTER_KEY`) that never leaves the server environment.
2. **API Key Hashing:** No key is ever saved in plain text. The database stores only hashes generated with **Argon2id**.
3. **Tenant Isolation:** The middleware ensures that an API Key from one service can never access or use resources belonging to another service.
4. **Rate Limiting:** Active protection against request abuse on email and template endpoints (Redis-backed).
5. **Signed Webhooks (HMAC SHA-256):** Key rotation webhooks are digitally signed; the `hermes-client` SDK validates the signature automatically before accepting a new key.

> For details on the authentication system, see [🔐 AUTHENTICATION.en.md](AUTHENTICATION.en.md).

---

Developed by [Ruan Lopes](https://github.com/RuanLopes1350). ISC License.
