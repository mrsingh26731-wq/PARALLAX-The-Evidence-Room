# PARALLAX — The Evidence Room

**Every record tells a story. Not everyone gets to read it.**

React + Express + Neon PostgreSQL. An editorial fictional investigation and an authorized evidence-management workspace. Case 074 — The Northline Incident is entirely fictional.

## Requirements

Node.js 22+, npm, and your own Neon database. No default privileged password, paid asset, external LLM, MongoDB, or in-memory production database is included.

The landing page and sanitized guest demo work without database credentials. Real authentication, persistence, query execution and encrypted evidence require setup below. Guest query/encryption demonstrations are explicitly labeled illustrations.

## 1. Install

Extract the ZIP and open the `PARALLAX` folder in VS Code:

```bash
npm ci
```

The root npm workspace lockfile installs both frontend/backend dependencies. Keep the root package-lock.json and all package.json files.

## 2. Configure

Copy `.env.example` to `.env` in the root. Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Create a Neon project/database and put its PostgreSQL connection URL in DATABASE_URL, retaining `sslmode=require`. Generate independent secrets:

```bash
npm run secrets
```

Copy the three generated values into ENCRYPTION_KEY, INTEGRITY_KEY and SESSION_SECRET in `.env`. Never commit or share them. Back them up privately: losing ENCRYPTION_KEY makes stored encrypted evidence unreadable.

Local settings:

```dotenv
APP_ORIGIN=http://localhost:5173
NODE_ENV=development
PORT=5000
```

The app loads root `.env`, then `backend/.env` without overriding existing values. Prefer one root file. Process environment variables take precedence. Never put server secrets in frontend files or VITE-prefixed variables.

## 3. Initialize PostgreSQL

Use the database owner's connection URL during setup:

```bash
npm run db:migrate
npm run db:seed
```

Run these serially. Both are idempotent. The seed inserts eight encrypted evidence records, seven relationships, eight fictional timeline events and synthetic search records. It does not overwrite an existing case or create credentials.

## 4. Create the first administrator

Temporarily set your own values in the private `.env`:

```dotenv
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YOUR-OWN-UNIQUE-PASSWORD-AT-LEAST-12-CHARACTERS
```

Then:

```bash
npm run admin:create
```

Remove ADMIN_EMAIL and ADMIN_PASSWORD from `.env` afterwards. A database singleton guard protects first-admin initialization. There is no public administrator signup/setup endpoint. Subsequent accounts are created in Workspace settings.

## 5. Run from VS Code

Terminal 1:

```bash
cd frontend
npm install
npm run dev
```

Terminal 2:

```bash
cd backend
npm install
node server.js
```

Open **http://localhost:5173** (use this hostname to match APP_ORIGIN). Vite uses localhost and fails clearly if port 5173 is occupied. Backend: **http://localhost:5000**. Vite proxies `/api`; no API URL edits or CORS workaround needed. The two npm install commands are redundant after root npm ci, but work with the workspace layout.

Alternatively run `npm run dev` from the root to launch both. Ctrl+C stops the pair. Running npm run dev inside frontend starts only Vite.

## 6. Use the workspace

Sign in as administrator → Workspace settings → Add user. Create an INVESTIGATOR and REVIEWER with their own temporary passwords, then add them to Case 074. They can change passwords in their profiles; changes invalidate all sessions.

Investigators can read public/internal/confidential records in assigned cases. Restricted records require an approved grant. External reviewers require membership plus an explicit grant for each record. Admins have global scope. Open the sealed report to request access; an administrator reviews it in Access requests.

## 7. Verify and deploy

```bash
npm test
npm run verify:local
npm run build
```

Stop existing development servers before `npm run verify:local`; it starts the exact frontend/backend commands, checks ports 5173/5000 and the API proxy, then stops its own processes.

The 24-test suite executes actual SQL/transactions in disposable PGlite (the PostgreSQL engine compiled to WebAssembly), with Supertest API requests. It never reads your DATABASE_URL. Production uses the Neon HTTP driver only.

See [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) for verification limits and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel. Import the **repository root**, not frontend. Live Neon transport and a real Vercel deployment were not verified without your account credentials.

## Included

- Original ivory/olive editorial landing, responsive shell and dossier.
- React Flow board, dragging/zoom, relationships, saved per-user positions.
- Cases, archival, encrypted evidence, versions, annotations and integrity verification.
- Standalone sessions, profile/password management, roles, memberships and disabling.
- Persisted access requests, review, expiring/revocable grants and backend Access X-Ray.
- Safe query replay, AES-256-GCM exhibit, synthetic role comparison.
- Fictional timeline, real audit trail, server-verified guided chapters and redacted printable report.
- Separate frontend/backend, Vercel adapter, migrations, seed, tests, lockfile and documentation.

## Structure

```text
frontend/src/       React pages, shared UI, API client and styles
frontend/public/    Sanitized guest fixture
backend/app.js     Middleware, sessions, authorization context
backend/routes/    Domain route modules
backend/security/  Validation, policy, encryption, hashing
backend/services/  Fictional seed source (server-only)
backend/db/        Neon adapter, migration, setup, runtime privileges
backend/tests/     Isolated SQL/API tests
api/index.js       Vercel export; no listener
scripts/           Local launcher and secret generation
docs/              Architecture, API, security, database, demo, deployment
```

## Product limits and trust boundaries

- Put sensitive information in encrypted bodies/annotations. Titles, case descriptions, relationship labels, request reasons and audit metadata are searchable plaintext.
- Board save requires an unfiltered complete first page, maximum 30 records. The API supports up to 300 positions/500 connections. Larger cases have metadata pagination, but the UI disables partial board replacement to avoid losing links. Positions are per user; relationships are case-wide. Simultaneous board saves are last-write-wins; text edits use version conflict checks.
- Archived cases reject evidence/board edits; archival is terminal in this version. Valid grants can still authorize reads.
- Revocation blocks subsequent server reads; it cannot erase information already delivered or printed.
- Audit records are not immutable. HMAC assumes server keys remain separate from the database and cannot defeat full valid-state rollback or prove a statement's truth.
- Evidence consists of textual records. Arbitrary file uploads, email-based password reset and external threat intelligence are not included.

Faculty walkthrough: [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md).
