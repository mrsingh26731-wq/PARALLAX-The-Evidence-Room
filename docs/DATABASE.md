# Database

Production uses Neon PostgreSQL over HTTP; tests use disposable PGlite PostgreSQL, never a runtime fallback.

| Tables | Purpose |
|---|---|
| schema_migrations | Applied versions |
| roles, permissions, role_permissions | Declared role model |
| users, user_sessions | Identity, password hash, role, active status; session/CSRF/expiry |
| rate_limits | Persistent throttle counters |
| cases, case_memberships | Investigation scope |
| evidence, evidence_versions | Searchable metadata; encrypted version snapshots and integrity proof |
| case_annotations | Encrypted notes with authors/timestamps |
| evidence_connections, evidence_board_positions | Case links and per-user positions |
| evidence_access_requests, evidence_access_grants | Review, identity/record binding, expiry and revocation |
| case_timeline_events | Fictional scenario chronology |
| audit_logs | Actual recorded actions |
| investigation_progress, investigation_findings | Verified chapter progress; encrypted conclusions |
| demo_records | Three synthetic search targets |
| admin_bootstrap | Singleton first-admin guard |

Composite foreign keys prevent cross-case graph/grant references. A partial unique index permits one pending request per user/evidence. Version keys are unique. Grant, session and audit queries have indexes.

Run npm run db:migrate then npm run db:seed, serially. Version 001 is recorded only after successful migration. Seed inserts Case 074 transactionally and does not rewrite existing records. Updating story source does not automatically update an existing case.

Create the first admin using owner credentials, then create a Neon role named parallax_app and apply runtime-privileges.sql as owner. Use that role's URL in production DATABASE_URL; retain owner credentials only for maintenance. This role can append versions/audit but cannot modify/delete them.

Authorized administrators can inspect encrypted representation with:

```sql
SELECT evidence_id, version,
       envelope->>'alg' AS algorithm,
       envelope->>'iv' AS nonce,
       envelope->>'ciphertext' AS ciphertext,
       envelope->>'tag' AS authentication_tag
FROM evidence_versions WHERE evidence_id = 'ev-05';
```

No plaintext body column exists. Search covers permitted metadata, not encrypted substring matching. Back up the database and keys separately. Expiry is checked at read time; no scheduler is needed. An administrator may periodically prune expired session/throttle rows. Keep revoked grants for traceability.
