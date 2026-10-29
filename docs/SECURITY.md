# Security and trust model

| Operation | ADMIN | INVESTIGATOR | REVIEWER |
|---|---|---|---|
| Case metadata/board | All cases | Assigned cases | Assigned cases, read only |
| Public/internal/confidential body | Allowed | Assigned case | Membership + explicit active grant |
| Restricted body | Allowed | Membership + explicit active grant | Membership + explicit active grant |
| Create/edit evidence | Allowed | Assigned open case; authorized record | Denied |
| Change classification | Allowed | Denied | Denied |
| Create restricted evidence | Allowed | Denied | Denied |
| Review/revoke requests | Allowed; no self-review | Denied | Denied |
| Users, roles, memberships | Allowed; no own role/status change | Denied | Denied |
| Case audit | Allowed | Assigned case | Denied |

## Authorization

Middleware and domain helpers enforce policy; UI visibility is not authority. Grants bind user, case and evidence, must be unrevoked, and must expire in the future. Case membership is separately required. Sessions join current active users/roles on every request. Admin role changes and disabling delete sessions. Public demo fields are sanitized; no privileged demo account exists.

## SQL injection

Neon `.query(text, parameters)` uses $1-style bound values; `.transaction()` executes batches. Untrusted values never form SQL text or identifiers. Sort columns come from a fixed title/created_at allowlist. The secure lab performs exact-match SELECT on three synthetic records. The unsafe panel is display-only, never executable SQL or eval. Migration SQL is trusted static source run from CLI, never HTTP input.

## Passwords, sessions and CSRF

Node scrypt: N=32768, r=8, p=1, 16-byte random salt, 64-byte output; constant-time comparison. New passwords require 12–200 characters. Passwords are hashed, not encrypted.

Login creates a random 32-byte opaque token; PostgreSQL stores its HMAC-SHA-256 using SESSION_SECRET. Sessions last eight hours. Cookie: HttpOnly, SameSite=Strict, Path=/, Secure in production. Logout removes it; password changes revoke all user sessions.

Every mutating request requires exact APP_ORIGIN, including login. Authenticated mutations also require X-CSRF-Token matching the per-session random token. No cross-site cookie workaround is used.

PostgreSQL-backed throttling: 12 login attempts per HMAC-obscured email per ten minutes; 120 query/cipher calls per user per ten minutes. These are basic controls, not complete abuse protection against attacks using many distinct identities.

## AES-256-GCM

Bodies/versions, annotations and saved conclusions are encrypted on the server using a 32-byte hexadecimal ENCRYPTION_KEY. Every encryption uses a fresh random 12-byte nonce. Envelopes include v=1, alg, Base64 nonce/ciphertext and the 16-byte authentication tag. Base64 is only byte representation.

Additional authenticated data binds ciphertext to evidenceID:version, or its annotation/user/case context. Authentication tags are checked before returning plaintext. Policy runs before evidence/history/annotation/report decryption. Tampered tags and context swaps fail. The Cipher Room exposes only synthetic demonstration ciphertext.

Key rotation is not automated. Back up keys separately; do not replace ENCRYPTION_KEY for an existing database without re-encryption. Versioning is present for future migration, not a claim of automatic rotation.

## Integrity

SHA-256 covers exact UTF-8 content. A separate INTEGRITY_KEY signs evidenceID:version:digest with HMAC-SHA-256. Verification decrypts, recomputes and compares both. Database-only alteration of ciphertext, context, digest or MAC is detected under the trusted-server/separate-key assumption.

This does not prove original truth, resist stolen application keys, detect a complete previously-valid database rollback, provide an external trusted timestamp, or create legally immutable evidence.

## Data minimization and privileges

Case descriptions, evidence titles, classifications, request reasons, relationship labels and audit metadata are plaintext. Do not put secrets there. Audits store actor/action/case/evidence/time, never tokens/passwords/keys/content. API responses use controlled errors and authorization-gated bodies.

Use db/runtime-privileges.sql with a separate production role. It grants no UPDATE/DELETE on evidence_versions or audit_logs. The schema owner can still change these records. PostgreSQL RLS is not enabled; security uses server policy, scoped queries, database role privileges and relational constraints.

Helmet, Zod, 64 KiB JSON limits, parameterized queries, session expiry, origin/CSRF checks and persistent throttles are implemented. A production security review remains necessary before using this portfolio project for regulated or legally significant evidence.
