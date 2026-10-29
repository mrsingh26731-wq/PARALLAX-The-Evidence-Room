# Verification record

## Continuation verification

- Inspected and continued the existing project; retained its implemented routes, security model and design.
- Re-ran all 24 SQL/API tests: 24 passed, 0 failed.
- Added `npm run verify:local`, which launches `node server.js` from backend and `npm run dev` from frontend, verifies ports 5000/5173, nested SPA routes, proxy JSON responses and public redaction, then terminates only its own processes. All checks passed.
- The first startup check exposed Vite network-interface enumeration failure with an all-interface bind in this execution environment. Changed the development default to localhost and retained strict port 5173; the exact startup check then passed.
- Keyed board components by case to prevent unsaved board state carrying into a different case.
- Rebuilt the production frontend after these changes.

## Executed

- Dependency installation completed with npm; root package-lock.json generated and retained.
- Vite production build completed successfully. Output is split into application, graph, motion and vendor chunks; no >500 KiB chunk warning remains.
- `npm test`: **24 passed, 0 failed, 0 skipped** using Node test runner, Supertest and disposable PGlite PostgreSQL.
- Production Express app and real SQL statements were exercised through the injected query/batch transport. No mocked SQL results.
- Local preview launched frontend + backend together. Browser successfully fetched the real `/api/lab/roles` endpoint through the Vite proxy.
- Browser inspection at laptop dimensions: landing, graph, restricted drawer, query replay, Cipher Room and navigation.
- Mobile layout inspected in actual 390-pixel iframe viewports. Landing root clientWidth and scrollWidth both 375 pixels (remaining width is scrollbar); no page-level horizontal overflow. Mobile board has a scrollable evidence index, collapsible navigation and pan/zoom graph.
- Found and fixed a restricted-badge CSS collision and an overwide mobile headline.
- Guest replay displayed zero matches for the injection sample and explicitly labeled the response a static illustration. Synthetic role comparison displayed administrator grant and investigator/reviewer denials from the server.

## Test coverage

1. Anonymous case/evidence denial.
2. Guest fixture contains no protected bodies.
3. Membership and cross-case denial.
4. Read-only roles and administrator endpoint restrictions.
5. Origin and CSRF validation.
6. Restricted decryption denial, sanitized decisions and ciphertext at rest.
7. Injection-shaped values execute as literal PostgreSQL parameters; tables remain intact.
8. Fresh nonce, tag tampering and context-swap rejection.
9. Persisted request/approval, expiration and revocation.
10. External reviewer requires explicit grants.
11. New versions preserve history and reject stale updates.
12. Integrity verification detects altered digest.
13. Graph position/relationship restore; foreign evidence rejected.
14. Reports redact inaccessible content.
15. Guided progression requires actual actions and correct checks.
16. Controlled invalid input and persistent audits.
17. Profile updates and password-driven session revocation.
18. Session expiry/logout.
19. Seed/migration idempotency.
20. API-first routing/SPA configuration and JSON unknown API response.
21. Encrypted annotations and access control.
22. Case, membership, evidence creation and archival.
23. Admin account creation and disabling.
24. Server-side category/classification filters, ordering and pagination.

## Not executed / remaining external checks

- No live Neon database URL was supplied. The Neon HTTP network transport, live migrations and production database privileges were not exercised against a Neon account. PGlite verifies SQL semantics but is not a Neon transport test.
- No Vercel account/project was connected. An actual deployment or authenticated `vercel build` was not run. Config was checked structurally and against official docs; this is not a guarantee that a particular hosting account is configured correctly.
- Full authenticated browser walkthrough was not run against live Neon. Authentication and all core protected flows were exercised at API/SQL level.
- Native mobile hardware, screen-reader audit, exhaustive browser matrix, load testing, cryptographic penetration testing and independent security review were not performed.

Repeat the post-deploy checklist in DEPLOYMENT.md with your accounts. No claim of zero bugs, immutable evidence, legal chain-of-custody certification, or guaranteed deployment is made.
