# Architecture

Browser → same-origin /api → Express middleware → scoped domain policy → Neon HTTP parameterized query/transaction → PostgreSQL.

Locally, Vite on 5173 proxies to Express on 5000. Vercel serves frontend/dist and invokes api/index.js, which exports the same app without listening on a port. No browser database connection, permanent process memory, persistent disk or WebSocket is used in production.

backend/app.js constructs a dependency-injectable query/batch context and shared authorization functions. Domain route registrars handle accounts, cases, evidence, graph, access, activity, labs, guided chapters and administration. Policy, validation, crypto, fictional seed and transport are separate modules.

Frontend pages separate landing/login, shell, graph/inspector, forms, security exhibits, chronology, missions/report and management. TanStack Query handles fetching; React Hook Form handles forms; Zod validates the API boundary. React Flow renders structured evidence. Motion provides transitions. Tailwind integration plus a custom CSS design system supplies the appearance.

The API client uses HttpOnly session cookies and the per-session CSRF header. Identity changes clear the query cache. Secrets and plaintext are not persisted in localStorage. Role comparison uses synthetic identities only.

## Transactions and consistency

Neon HTTP batch() wraps non-interactive parameterized statements in a transaction. Case+membership+audit, evidence+version+audit, board replacement+audit, grant review+grant+audit and verdict+progress+audit are atomic.

Evidence updates use a conditional CTE matching the submitted version before incrementing. Stale writers receive 409. A successful-update audit is appended after the version transaction; an interruption can leave the attempted-update event without the later success event. Grant review transitions pending requests once. Rejected grants are stored revoked and cannot authorize reads.

Composite evidence/case foreign keys prevent cross-case links, positions and grants. A membership check precedes every protected case operation; admin has global scope. Policy is reevaluated per request. Administrative revocation does not retroactively cancel an already-running request; strict simultaneous revocation would need stronger transaction locks or database RLS.

## Routes

/ landing; /login standalone login; /demo/{board,timeline,replay,cipher,missions,report} guest exhibits; /workspace/{board,timeline,replay,cipher,missions,report,requests,audit,settings} authorized screens. Query parameter case selects the case; evidence selects a timeline-linked record.

The fictional timeline is authored seed data. Real audit events use database timestamps. Tests inject a disposable PostgreSQL engine through the same transport interface; PGlite is never a production fallback.
