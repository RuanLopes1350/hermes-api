# 📚 Tutorial: How to Configure and Use Hermes

> 🇧🇷 **Versão em Português?** [TUTORIAL.md](TUTORIAL.md)

This tutorial is a practical, step-by-step guide to get the Hermes infrastructure running, configure credentials, create MJML templates, and send test emails.

---

## 📋 Prerequisites

To run the full ecosystem locally, make sure you have:

- **Docker** and **Docker Compose** (to provision PostgreSQL and Redis locally).
- **Node.js 20+** and **npm** (required to run the API, the Worker, and the Frontend).
- An email account for testing (Gmail with an active App Password, or a project configured in the Google Cloud Console).

---

## 🚀 1. Setting Up and Starting the Base Infrastructure

The recommended way to start Hermes in development uses **Docker Compose** to provision PostgreSQL and Redis, while the API, Worker, and Frontend are run directly with Node.js.

### Step 1: Configure the API Environment Variables

Navigate to the API directory and create the `.env` file:

```bash
cd hermes-api
cp .env.example .env
```

Open the `.env` file and fill in the required variables:

```env
PORT=3001
NODE_ENV=development
TZ=America/Manaus

# PostgreSQL Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hermes
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hermes

# Redis (BullMQ Queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Admin user credentials (read at server startup by Better Auth)
ADMIN_NAME="Hermes Administrator"
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=StrongPassword123

# Better Auth Settings
AUTH_SECRET=a_random_32_byte_secret_here
AUTH_BASE_URL=http://localhost:3001
AUTH_TRUSTED_ORIGINS=http://localhost:3000

# Master Key for Encryption (AES-256-GCM)
MASTER_KEY=a_secret_master_key_for_AES_256_GCM_here
```

### Step 2: Start the database and Redis

Still inside `hermes-api/`, run:

```bash
docker compose up -d db redis
```

This starts only **Postgres** (port `5432`) and **Redis** (port `6379`) via Docker Compose.

### Step 3: Apply the database schema

```bash
npm run db:push   # Apply the schema (Drizzle Kit)
```

### Step 4 (Optional): Seed with demo data

> **⚠️ Warning:** `npm run seed` **deletes all existing data** (TRUNCATE CASCADE) and repopulates the database with demo users, services, templates, and emails. Only run this if you want a pre-filled development environment. **Only works with `NODE_ENV=development`.**

```bash
npm run seed
```

After seeding, the following logins will be available (password: `password123`):
- **Super Admin:** `admin@hermes.com`
- **Admin:** `bruno.tavares@hermes.com`
- **User:** `user@hermes.com`

---

## 🛠️ 2. Running the Microservices in Development Mode

### Running the API and the Worker

Open **two terminals** inside `hermes-api/`:

- **Terminal 1** - Start the REST API (port configured in `PORT`):
  ```bash
  npm run dev:api
  ```
- **Terminal 2** - Start the email Worker:
  ```bash
  npm run dev:worker
  ```

### Running the Frontend

1. In another terminal, navigate to `hermes-front`:
   ```bash
   cd hermes-front
   ```
2. Copy and configure the environment file:
   ```bash
   cp .env.example .env
   # Edit .env: NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
3. Install dependencies and start the Next.js server:
   ```bash
   npm install
   npm run dev
   ```

---

## 💻 3. Using the Platform (Full Walkthrough)

With the API running and the frontend on port `3000`, follow the steps below to set up your first email dispatch.

### Step 1: Log In

Open **`http://localhost:3000`** and log in with the admin credentials defined in your `.env` file (`ADMIN_EMAIL` and `ADMIN_PASSWORD`), or use `admin@hermes.com` / `password123` if you ran the seed.

### Step 2: Create a Service (Tenant Namespace)

1. In the side menu, go to **Services** and click **New Service**.
2. Enter a name (e.g., `Sales System`) and click **Save**.
3. The service will generate a unique ID (e.g., `clxxxxxxx0000xxxx`). Save this ID.

### Step 3: Register SMTP Credentials or Google OAuth2

1. Inside the created service, click the **Credentials** tab and then **New Credential**.
2. Fill in the email server dispatch settings:
   - **Traditional SMTP Method:** Enter the Host, Port, Login (sender email), and password/App Password.
   - **Google OAuth2 Method:**
     1. Enter your Client ID and Client Secret created in the Google Cloud Console.
     2. Click **Save**.
     3. In the credentials list, click **Authorize** to open the Google consent screen and dynamically link your Gmail account.

### Step 4: Create an MJML Template

1. In the left menu, go to **Templates** and click **New Template**.
2. Write the content using **MJML** tags (to ensure 100% responsive emails).
3. You can use Handlebars tags to inject variables:
   ```xml
   <mjml>
     <mj-body>
       <mj-section>
         <mj-column>
           <mj-text font-size="20px" color="#333">Hello, {{name}}!</mj-text>
           <mj-text>Your activation code is: <strong>{{code}}</strong></mj-text>
         </mj-column>
       </mj-section>
     </mj-body>
   </mjml>
   ```
4. Preview the template rendering live in the panel and click **Save**.
5. Copy the generated **Template ID**.

### Step 5: Generate an API Key

1. Go to the **API Keys** tab of your service and click **Generate New Key**.
2. Select the default **Sending Credential** associated with this key.
3. Set an identifier name and an expiration date (optional).
4. Click **Generate**.
5. **⚠️ Important:** Copy the displayed key (in the format `hm_prefix.secret`), as it is stored only as a hash and **will not be shown again** for security reasons.

---

## ✉️ 4. Sending Emails Programmatically

With your API Key and Template ID in hand, your external application is ready to send emails.

> **Note on the endpoint:** Email sending via API Key uses the route `POST /api/emails` (without a serviceId in the path). The serviceId and credentialId are identified automatically by the middleware from the API Key itself.

### Option A: Using the Official SDK (`hermes-client`)

Install the SDK in your project:

```bash
npm install @ruanlopes1350/hermes-client
```

Configure and use it:

```typescript
import { HermesClient, MemoryAdapter } from '@ruanlopes1350/hermes-client';

const hermes = new HermesClient({
  baseUrl: 'http://localhost:3001',
  storageAdapter: new MemoryAdapter('hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f'),
});

await hermes.email()
  .to('customer@email.com')
  .subject('Registration Confirmation')
  .useTemplate('cltmplxxxxxx0000xxxx', { name: 'Carlos Silva', code: '9582' })
  .send();
```

### Option B: Direct HTTP Call via cURL

```bash
curl -X POST http://localhost:3001/api/emails \
  -H "X-API-Key: hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_to": "customer@email.com",
    "subject": "Registration Confirmation",
    "template_id": "cltmplxxxxxx0000xxxx",
    "variables": {
      "name": "Carlos Silva",
      "code": "9582"
    }
  }'
```

### Success Response (201 Created)

```json
{
  "error": false,
  "code": 201,
  "message": "E-mail enfileirado com sucesso!",
  "data": {
    "id": "clemailxxxxxx0000xxxx",
    "status": "pending",
    "recipient_to": "customer@email.com",
    "subject": "Registration Confirmation"
  },
  "errors": []
}
```

The API places the email in the asynchronous processing queue. Within seconds, the Worker reads the task, processes the MJML template with the provided data, decrypts the SMTP credentials, and delivers the email - updating the record status in the database to `sent` (or `failed` in case of a definitive error).

Track delivery rates, sending errors, and analytics charts directly on the main Hermes admin dashboard at **`http://localhost:3000`**.
