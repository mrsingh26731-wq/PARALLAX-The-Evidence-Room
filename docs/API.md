# REST API

Base path: `/api`. JSON request/response bodies. Same-origin cookies. All mutations require `Origin: APP_ORIGIN`; authenticated mutations also require `X-CSRF-Token` from login/me. Protected APIs reject missing/expired sessions with 401. Authorization failures use 403 or scope-safe 404. Zod input errors use 400, version conflicts 409, knowledge-check failures 422, throttle 429, missing server configuration 503. Unknown APIs return JSON, not the SPA.

Public: health, demo, lab/roles, auth/login. Everything else requires a session. Domain policies are documented in SECURITY.md. Routes are grouped in backend/routes; backend/app.js owns login and middleware.

| Method | Route | Module |
|---|---|---|
| GET | `/api/admin/users` | administration.js |
| POST | `/api/admin/users` | administration.js |
| PATCH | `/api/admin/users/:uid` | administration.js |
| POST | `/api/auth/login` | app.js |
| POST | `/api/auth/logout` | account.js |
| GET | `/api/auth/me` | account.js |
| GET | `/api/cases` | cases.js |
| POST | `/api/cases` | cases.js |
| GET | `/api/cases/:cid` | cases.js |
| PATCH | `/api/cases/:cid` | cases.js |
| GET | `/api/cases/:cid/audit` | activity.js |
| GET | `/api/cases/:cid/board` | board.js |
| PUT | `/api/cases/:cid/board` | board.js |
| POST | `/api/cases/:cid/check` | guided.js |
| GET | `/api/cases/:cid/evidence` | evidence.js |
| POST | `/api/cases/:cid/evidence` | evidence.js |
| GET | `/api/cases/:cid/members` | administration.js |
| POST | `/api/cases/:cid/members` | administration.js |
| GET | `/api/cases/:cid/progress` | guided.js |
| GET | `/api/cases/:cid/report` | guided.js |
| GET | `/api/cases/:cid/timeline` | activity.js |
| POST | `/api/cases/:cid/verdict` | guided.js |
| GET | `/api/demo` | app.js |
| GET | `/api/evidence/:eid` | evidence.js |
| PATCH | `/api/evidence/:eid` | evidence.js |
| GET | `/api/evidence/:eid/annotations` | evidence.js |
| POST | `/api/evidence/:eid/annotations` | evidence.js |
| GET | `/api/evidence/:eid/decision` | evidence.js |
| GET | `/api/evidence/:eid/history` | evidence.js |
| POST | `/api/evidence/:eid/requests` | access.js |
| POST | `/api/evidence/:eid/verify` | evidence.js |
| GET | `/api/grants` | access.js |
| POST | `/api/grants/:gid/revoke` | access.js |
| GET | `/api/health` | app.js |
| POST | `/api/lab/cipher` | labs.js |
| POST | `/api/lab/query` | labs.js |
| GET | `/api/lab/roles` | app.js |
| PATCH | `/api/profile` | account.js |
| POST | `/api/profile/password` | account.js |
| GET | `/api/requests` | access.js |
| POST | `/api/requests/:rid/review` | access.js |

## Payloads

- Login: `{email,password}` → `{user:{id,name,email,role},csrf}` plus HttpOnly cookie.
- Profile: PATCH `{name}`. Password: POST `{current,password}` (revokes all sessions).
- Case create: `{title,description}`. Update: `{title,description,status:"OPEN"|"ARCHIVED"}`.
- Evidence create: `{title,category,classification,content}`. Update requires `version` from the read; mismatch returns 409.
- Categories: DOCUMENT, PERSON, EVENT, ACCESS, DATABASE, FINDING. Classifications: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED.
- Evidence listing query: `search`, `classification`, `category`, `sort=title|created_at`, `page=1...`; 30 rows/page, each row includes total. Only safe case metadata is searched/returned.
- Decision: `{allowed,steps:[{label,pass}],grant}`; never hidden content.
- Board PUT: `{positions:[{id,x,y}],connections:[{source,target,label}]}`. Replaces user's positions and case-wide connections transactionally. UI restricts saves to a complete unfiltered page.
- Annotation create: `{content}`; max 2000 chars, stored encrypted.
- Access request: `{reason}`. Review: `{approve:boolean,hours:1...72}`. Revoke: `{}`.
- Query lab: `{input}` → fixed query template, parameters and synthetic matching rows.
- Cipher lab: `{tamper:boolean}` → synthetic plaintext/envelope/recovered/verified. Never an arbitrary decryption oracle.
- Chapter check: `{answer:"key-outside-database"|"base64"|"hash-is-encryption"}`. Requires prior synthetic recovery.
- Verdict: `{finding:"reclassified"|"exfiltrated"|"deleted",conclusion}`; requires chapters 1–4 and supported finding.
- User create: `{name,email,password,role}`. Update: `{role,active}`; admin only, own changes rejected.
- Membership: `{userId,remove:boolean}`; admin only.
- Integrity verify: `{}` → valid, version, storedDigest, calculatedDigest, qualified explanation.
- Report: permission-filtered records, generation timestamp, fictional flag and current user's latest decrypted conclusion.

Identifiers are opaque strings. Metadata titles max 160 characters; encrypted evidence content max 12000. No untrusted identifier interpolation, arbitrary SQL execution, key disclosure, or public privileged account endpoint exists.
