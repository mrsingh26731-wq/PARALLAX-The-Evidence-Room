# Faculty demo — about 10–15 minutes

## Before the session

Follow README setup. Create three accounts: administrator, investigator, external reviewer. Add investigator/reviewer to Case 074. Use separate browser profiles to keep sessions separate. Do not project real credentials or environment variables. All seeded people/events are fictional.

## 1. Establish the scenario — 1 minute

Open the landing page. Explain: Northline Transit in fictional Bellwether saw an unfamiliar login, a suspicious query and a report missing from its usual listing. The product asks who can read a record, whether input can change SQL, and what a database leak exposes.

Enter the guest evidence board. Pan, zoom, select a node, search and filter. Restricted contents are absent from guest data, not merely hidden by CSS. Guest mode is read-only and explicitly illustrative.

## 2. Identity and access — 2 minutes

Sign in as investigator. Open The first signal: chapter 1 records an actual authorized server read. Open The sealed report: Access X-Ray returns the backend decision and chapter 2 records the policy check. Try changing the evidence URL: the backend still denies unauthorized bodies.

Request access with a nonsensitive reason. Refresh Access requests to show persistence. In the admin profile approve for one hour. Back in investigator, reopen the record to see authorized content. Revoke from admin and retry; the next server read fails. An expired grant also fails without a scheduled job.

Open the external-reviewer profile: even ordinary case evidence requires an explicit grant. Case membership alone does not reveal bodies.

## 3. Query boundary — 2 minutes

As investigator, open Breach replay. Run `Northline incident summary`: one exact-match row. Then run `' OR '1'='1`: zero rows. The real query is `WHERE label = $1`; the payload remains a value. The left panel is an educational illustration and never executes vulnerable SQL. This action satisfies chapter 3.

Mention that metadata search is also parameterized; keyword blocking is not the security mechanism.

## 4. Encryption and integrity — 2 minutes

Open Cipher Room and Recover exhibit. Show nonce, ciphertext and authentication tag from actual server AES-256-GCM. Recover again to see different ciphertext/nonce. Alter the tag: decryption fails. The visible plaintext is an explicitly synthetic exhibit.

In the Neon SQL editor, use the query in DATABASE.md to inspect ev-05's stored envelope. No plaintext body column exists. Never display your connection string or keys.

Open an authorized evidence record and Verify integrity. Explain SHA-256 plus an HMAC whose key lives outside the database. This is tamper detection under a stated trust model, not immutable evidence or proof the original claim is true.

## 5. Real workspace — 2 minutes

Edit an authorized record; inspect old and new versions. Add an encrypted annotation. Move a graph node, create or rename a meaningful relationship, save and refresh. See persisted positions and connections.

Create another case, add evidence, and assign membership. Archive only the disposable demonstration case; archived cases are read-only in this version. Show that a reviewer cannot edit, and investigators cannot change roles.

## 6. Conclude — 2 minutes

In Follow the evidence, answer chapter 4 after recovering the synthetic exhibit: the key is outside the database. Open Final verdict. Choose reclassified and explain the conclusion. Completion requires prior verified actions, not a client-only checkbox.

The supported conclusion is: the SQL injection failed, the restricted access attempt was denied, and the report was reclassified rather than deleted. The unfamiliar login still merits a separate credential investigation; these records do not establish exfiltration.

Generate the report and print/save PDF. Limited roles get redactions. Show actual audit events separately from authored fictional timeline events.

## Academic mapping

| Objective | Demonstration |
|---|---|
| Role-based access control | Current role + case membership + classification + record grant; server denies read/edit/admin requests |
| SQL injection prevention | Real bound PostgreSQL parameters, harmless synthetic query targets and executable tests |
| Encryption | AES-256-GCM server-only keys, fresh nonce, tag checks and encrypted stored fields |
| Accountability | Versions, actor/time audit, SHA-256 and separate keyed integrity proof |

Do not describe guest illustrations as live database calls, or this fictional incident as a real attack.
