# Deploy to Vercel + Neon

This configuration uses stable Vercel Node functions and static Vite output, not beta Vercel Services. No code changes are needed for normal deployment. Your own database, secrets, and hosting account are required.

## Database and first administrator

1. In Neon, create a project and database. Choose a region near your intended Vercel function region.
2. Open Connect, select the database/role and copy the PostgreSQL connection URL. Keep SSL required. Put it in your local root .env as DATABASE_URL.
3. Run npm ci and npm run secrets. Add the three independent generated secrets to root .env.
4. Run npm run db:migrate and npm run db:seed against this database. Run setup once, serially, outside Vercel builds.
5. Temporarily set ADMIN_EMAIL and ADMIN_PASSWORD in local .env; run npm run admin:create; remove those two values afterwards.
6. For least privilege, create a separate Neon database role named parallax_app, apply backend/db/runtime-privileges.sql as owner through the SQL editor, and use the new role's URL for the deployment. Keep the owner URL private for migrations/maintenance.

## GitHub and Vercel

From the extracted PARALLAX directory:

```bash
git init
git add .
git commit -m "Build PARALLAX evidence room"
```

Create your own empty GitHub repository. Use its actual URL:

```bash
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Check git status before pushing: `.env`, node_modules and dist must not be tracked. Import the repository in Vercel. Set Root Directory to the repository root (leave blank), **not frontend**.

| Setting | Value |
|---|---|
| Framework | Other (framework:null in vercel.json) |
| Install command | npm ci |
| Build command | npm run build |
| Output directory | frontend/dist |
| Node version | 22.x or a compatible newer supported release |
| API entry | api/index.js |

The committed vercel.json supplies install/build/output settings. API rewrites appear first, mapping /api/:path* to /api/index. The SPA fallback excludes api/ and assets/. Unknown API calls remain JSON responses rather than returning index.html. Express is exported; backend/server.js is only the local listener.

## Environment variables

Add these to Vercel's server environment before using login:

| Name | Value |
|---|---|
| DATABASE_URL | Production Neon role connection URL |
| ENCRYPTION_KEY | Same 64-hex-character key used to seed that database |
| INTEGRITY_KEY | Same separate 64-hex-character integrity key |
| SESSION_SECRET | At least 32 characters; use generated 64-hex value |
| APP_ORIGIN | Exact HTTPS application origin, no trailing slash |
| NODE_ENV | production |

Do not configure ADMIN_PASSWORD, ADMIN_EMAIL or any VITE-prefixed secret in Vercel. PORT is only for local operation and is not required on Vercel. A frontend environment file is unnecessary because all requests use relative /api paths.

Deploy to obtain the assigned domain if not already known, set APP_ORIGIN to that domain, then redeploy to apply it. A custom domain requires updating APP_ORIGIN and redeploying. Separate Preview/Production databases and secrets; a preview URL will fail mutations if APP_ORIGIN still points to production. Never weaken the origin check to accept arbitrary hosts.

## Verify after deployment

- `/` displays the editorial landing.
- `/demo/board` works as a direct URL and after refresh.
- `/api/health` returns JSON. It reports configuration presence, not a database connectivity guarantee.
- Login with the administrator you created; successful login and case retrieval confirm database connectivity.
- An anonymous `/api/cases` request returns JSON 401.
- Create an investigator, add Case 074 membership, sign in in a separate browser profile, and verify sealed evidence returns a denial.
- Request access; approve as admin; verify read, then revoke and retry.
- Move nodes, save board, reload and confirm positions persist.
- Edit a record and inspect its version history.
- Run the query and cipher exhibits; inspect the generated report for redaction under limited clearance.
- Check secure HttpOnly cookies and no secrets in frontend assets.

## Troubleshooting

**503 configuration message:** DATABASE_URL or one of the secrets is missing/malformed. Set all variables and redeploy.

**Origin rejected:** APP_ORIGIN must exactly match scheme+hostname+port. No path or trailing slash. Local uses http://localhost:5173; production uses your HTTPS domain.

**Login failure:** Ensure migrate, seed and admin:create ran against the same database and the password is correct. There is no default admin.

**Unable to decrypt existing data:** Restore the correct encryption key. Do not reseed to conceal a key mismatch. Back up data before any repair.

**API returns HTML:** Root Directory should be repository root, and API rewrite must precede SPA fallback. Do not replace vercel.json with a generic catch-all Vite rewrite.

**No cases for a new user:** Admin must add case membership. The demo is not an authenticated workspace assignment.

**403 on a reviewer record:** Reviewers need a valid explicit grant even for PUBLIC-classified workspace evidence. The separate public demo is intentionally sanitized.

## Verified source references

Configuration was checked against official documentation; this is not a claim of a completed live deployment:

- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/routing/rewrites
- https://neon.com/docs/serverless/serverless-driver

A live Neon HTTP connection and actual Vercel deployment were not executed because no account credentials were supplied. See TEST_RESULTS.md for exactly what ran.
