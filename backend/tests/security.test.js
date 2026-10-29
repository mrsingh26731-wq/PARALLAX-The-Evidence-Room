import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import request from "supertest";
import { randomBytes } from "node:crypto";
import { createApp } from "../app.js";
import { migrate, seed } from "../db/setup.js";
import { hashPassword, seal, unseal, integrity } from "../security/crypto.js";
import { readFile } from "node:fs/promises";
const pg = new PGlite();
const db = {
  query: async (s, p = []) => (await pg.query(s, p)).rows,
  batch: (items) =>
    pg.transaction(async (tx) => {
      const out = [];
      for (const [s, p = []] of items) out.push((await tx.query(s, p)).rows);
      return out;
    }),
};
const cfg = {
  key: randomBytes(32).toString("hex"),
  integrity: randomBytes(32).toString("hex"),
  session: randomBytes(32).toString("hex"),
  origin: "http://localhost:5173",
  production: false,
};
const app = createApp(db, cfg);
let admin, investigator, reviewer, outsider;
async function login(email) {
  const agent = request.agent(app);
  const r = await agent
    .post("/api/auth/login")
    .set("Origin", cfg.origin)
    .send({ email, password: "Test-only-password-2026" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return { agent, csrf: r.body.csrf };
}
const write = (who, method, path, body) =>
  who.agent[method](path)
    .set("Origin", cfg.origin)
    .set("X-CSRF-Token", who.csrf)
    .send(body);
before(async () => {
  await migrate(db);
  await seed(db, cfg);
  const hash = await hashPassword("Test-only-password-2026");
  for (const [id, role] of [
    ["admin", "ADMIN"],
    ["investigator", "INVESTIGATOR"],
    ["reviewer", "REVIEWER"],
    ["outsider", "INVESTIGATOR"],
  ])
    await db.query(
      "INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$1,$3,$4)",
      [id, id + "@example.test", hash, role],
    );
  for (const id of ["investigator", "reviewer"])
    await db.query("INSERT INTO case_memberships VALUES($1,$2)", [
      "case-074",
      id,
    ]);
  await db.query(
    "INSERT INTO cases(id,title,description) VALUES('other-case','Other','Other case')",
  );
  admin = await login("admin@example.test");
  investigator = await login("investigator@example.test");
  reviewer = await login("reviewer@example.test");
  outsider = await login("outsider@example.test");
});
after(async () => {
  await pg.close();
});
test("anonymous callers cannot access cases or evidence", async () => {
  assert.equal((await request(app).get("/api/cases")).status, 401);
  assert.equal((await request(app).get("/api/evidence/ev-05")).status, 401);
});
test("guest preview contains no confidential content", async () => {
  const r = await request(app).get("/api/demo");
  assert.equal(r.status, 200);
  for (const e of r.body.evidence)
    if (e.classification !== "PUBLIC") assert.equal(e.content, undefined);
  assert.equal(JSON.stringify(r.body).includes("Rowan Hale"), false);
});
test("case membership and cross-case access are enforced", async () => {
  assert.equal((await outsider.agent.get("/api/cases/case-074")).status, 404);
  assert.equal(
    (await investigator.agent.get("/api/cases/other-case")).status,
    404,
  );
  assert.equal((await outsider.agent.get("/api/evidence/ev-01")).status, 404);
});
test("reviewers cannot edit and investigators cannot manage users or escalate roles", async () => {
  assert.equal(
    (
      await write(reviewer, "post", "/api/cases/case-074/evidence", {
        title: "x",
        content: "x",
        category: "DOCUMENT",
        classification: "PUBLIC",
      })
    ).status,
    403,
  );
  assert.equal((await investigator.agent.get("/api/admin/users")).status, 403);
  assert.equal(
    (
      await write(investigator, "patch", "/api/admin/users/investigator", {
        role: "ADMIN",
        active: true,
      })
    ).status,
    403,
  );
});
test("CSRF and origin must both match", async () => {
  assert.equal(
    (
      await investigator.agent
        .post("/api/lab/query")
        .set("Origin", cfg.origin)
        .send({ input: "x" })
    ).status,
    403,
  );
  assert.equal(
    (
      await investigator.agent
        .post("/api/lab/query")
        .set("Origin", "https://evil.example")
        .set("X-CSRF-Token", investigator.csrf)
        .send({ input: "x" })
    ).status,
    403,
  );
});
test("restricted reads denied, decisions sanitized and encrypted at rest", async () => {
  const r = await investigator.agent.get("/api/evidence/ev-05");
  assert.equal(r.status, 403);
  const p = await investigator.agent.get("/api/evidence/ev-05/decision");
  assert.equal(p.body.allowed, false);
  assert.equal(JSON.stringify(p.body).includes("Rowan"), false);
  const [v] = await db.query(
    "SELECT envelope FROM evidence_versions WHERE evidence_id=$1",
    ["ev-05"],
  );
  assert.equal(JSON.stringify(v).includes("Rowan"), false);
  assert.equal(v.envelope.alg, "AES-256-GCM");
  assert.ok(unseal(v.envelope, cfg.key, "ev-05:1").includes("Rowan"));
});
test("parameterized injection strings execute as literal values in PostgreSQL engine", async () => {
  for (const input of [
    "' OR '1'='1",
    "'; DROP TABLE evidence; --",
    "' UNION SELECT 1, 'x' --",
  ]) {
    const r = await write(investigator, "post", "/api/lab/query", { input });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.rows, []);
    assert.deepEqual(r.body.parameters, [input]);
  }
  const normal = await write(investigator, "post", "/api/lab/query", {
    input: "Archive index",
  });
  assert.equal(normal.body.rows.length, 1);
  assert.equal(
    (await db.query("SELECT count(*)::int AS count FROM evidence"))[0].count,
    8,
  );
});
test("tampered tags and context swaps fail; nonce is fresh", () => {
  const a = seal("test", cfg.key, "a"),
    b = seal("test", cfg.key, "a");
  assert.notEqual(a.iv, b.iv);
  assert.throws(() =>
    unseal({ ...a, tag: Buffer.alloc(16).toString("base64") }, cfg.key, "a"),
  );
  assert.throws(() => unseal(a, cfg.key, "b"));
});
test("access requests, approval, expiry and revocation persist and govern plaintext", async () => {
  let r = await write(investigator, "post", "/api/evidence/ev-05/requests", {
    reason: "Review case evidence",
  });
  assert.equal(r.status, 201);
  const list = await admin.agent.get("/api/requests");
  const pending = list.body.find((x) => x.user_id === "investigator");
  assert.ok(pending);
  assert.equal(
    (
      await write(admin, "post", `/api/requests/${pending.id}/review`, {
        approve: true,
        hours: 1,
      })
    ).status,
    200,
  );
  assert.equal(
    (await investigator.agent.get("/api/evidence/ev-05")).status,
    200,
  );
  const [g] = await db.query(
    "SELECT * FROM evidence_access_grants WHERE user_id=$1",
    ["investigator"],
  );
  await db.query(
    "UPDATE evidence_access_grants SET expires_at=now()-interval '1 minute' WHERE id=$1",
    [g.id],
  );
  assert.equal(
    (await investigator.agent.get("/api/evidence/ev-05")).status,
    403,
  );
  await db.query(
    "UPDATE evidence_access_grants SET expires_at=now()+interval '1 hour' WHERE id=$1",
    [g.id],
  );
  assert.equal(
    (await write(admin, "post", `/api/grants/${g.id}/revoke`, {})).status,
    200,
  );
  assert.equal(
    (await investigator.agent.get("/api/evidence/ev-05")).status,
    403,
  );
});
test("external reviewer needs explicit evidence grant even on public classification", async () => {
  assert.equal((await reviewer.agent.get("/api/evidence/ev-01")).status, 403);
  const r = await write(reviewer, "post", "/api/evidence/ev-01/requests", {
    reason: "External review",
  });
  assert.equal(r.status, 201);
  const list = await admin.agent.get("/api/requests");
  const pending = list.body.find((x) => x.user_id === "reviewer");
  await write(admin, "post", `/api/requests/${pending.id}/review`, {
    approve: true,
    hours: 1,
  });
  assert.equal((await reviewer.agent.get("/api/evidence/ev-01")).status, 200);
});
test("evidence revisions preserve history and reject stale writes", async () => {
  const b = {
    title: "Preservation receipt",
    category: "EVENT",
    classification: "INTERNAL",
    content: "Revised synthetic receipt",
    version: 1,
  };
  let r = await write(investigator, "patch", "/api/evidence/ev-06", b);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.version, 2);
  r = await write(investigator, "patch", "/api/evidence/ev-06", b);
  assert.equal(r.status, 409);
  const h = await investigator.agent.get("/api/evidence/ev-06/history");
  assert.equal(h.body.length, 2);
  assert.equal(h.body[0].content, b.content);
  assert.match(h.body[1].content, /09:25/);
});
test("integrity verifies and detects tampered digest", async () => {
  let r = await write(investigator, "post", "/api/evidence/ev-06/verify", {});
  assert.equal(r.body.valid, true);
  await db.query(
    "UPDATE evidence_versions SET digest='tampered' WHERE evidence_id='ev-06' AND version=2",
  );
  r = await write(investigator, "post", "/api/evidence/ev-06/verify", {});
  assert.equal(r.body.valid, false);
});
test("graph positions and connections restore; foreign evidence rejected", async () => {
  const b = {
    positions: [{ id: "ev-01", x: 345, y: 678 }],
    connections: [
      { source: "ev-01", target: "ev-02", label: "test relationship" },
    ],
  };
  assert.equal(
    (await write(investigator, "put", "/api/cases/case-074/board", b)).status,
    200,
  );
  const restored = await investigator.agent.get("/api/cases/case-074/board");
  assert.deepEqual(restored.body.positions, [
    { evidence_id: "ev-01", x: 345, y: 678 },
  ]);
  assert.equal(restored.body.connections[0].label, "test relationship");
  assert.equal(
    (
      await write(investigator, "put", "/api/cases/case-074/board", {
        positions: [{ id: "missing", x: 0, y: 0 }],
        connections: [],
      })
    ).status,
    400,
  );
});
test("report redacts restricted plaintext and reports own conclusion only", async () => {
  const r = await investigator.agent.get("/api/cases/case-074/report");
  assert.equal(r.status, 200);
  assert.match(
    r.body.records.find((x) => x.id === "ev-05").content,
    /REDACTED/,
  );
  assert.equal(JSON.stringify(r.body).includes("Rowan"), false);
});
test("guided progression requires real actions and knowledge checks", async () => {
  let r = await write(investigator, "post", "/api/cases/case-074/verdict", {
    finding: "reclassified",
    conclusion: "The report was reclassified.",
  });
  assert.equal(r.status, 409);
  await investigator.agent.get("/api/evidence/ev-01");
  await investigator.agent.get("/api/evidence/ev-05/decision");
  await write(investigator, "post", "/api/lab/query", { input: "' OR '1'='1" });
  assert.equal(
    (
      await write(investigator, "post", "/api/cases/case-074/check", {
        answer: "base64",
      })
    ).status,
    422,
  );
  await write(investigator, "post", "/api/lab/cipher", { tamper: false });
  assert.equal(
    (
      await write(investigator, "post", "/api/cases/case-074/check", {
        answer: "key-outside-database",
      })
    ).status,
    200,
  );
  r = await write(investigator, "post", "/api/cases/case-074/verdict", {
    finding: "reclassified",
    conclusion: "The report was reclassified. Queries were bound as data.",
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const progress = await investigator.agent.get("/api/cases/case-074/progress");
  assert.equal(progress.body.length, 5);
});
test("invalid input is controlled and audit events persist", async () => {
  assert.equal(
    (await write(investigator, "post", "/api/lab/query", { input: { bad: 1 } }))
      .status,
    400,
  );
  const logs = await investigator.agent.get("/api/cases/case-074/audit");
  assert.equal(logs.status, 200);
  assert.ok(logs.body.some((r) => r.action === "ACCESS_DENIED"));
  assert.ok(logs.body.some((r) => r.action === "EVIDENCE_UPDATED"));
  assert.equal(
    (await reviewer.agent.get("/api/cases/case-074/audit")).status,
    403,
  );
});
test("profile updates persist, passwords revoke all sessions", async () => {
  assert.equal(
    (await write(outsider, "patch", "/api/profile", { name: "Updated name" }))
      .status,
    200,
  );
  assert.equal(
    (await outsider.agent.get("/api/auth/me")).body.user.name,
    "Updated name",
  );
  assert.equal(
    (
      await write(outsider, "post", "/api/profile/password", {
        current: "Test-only-password-2026",
        password: "New-test-password-2026",
      })
    ).status,
    200,
  );
  assert.equal((await outsider.agent.get("/api/auth/me")).status, 401);
});
test("expired sessions fail and logout removes session", async () => {
  await db.query(
    "UPDATE user_sessions SET expires_at=now()-interval '1 minute' WHERE user_id='reviewer'",
  );
  assert.equal((await reviewer.agent.get("/api/auth/me")).status, 401);
  assert.equal(
    (await write(investigator, "post", "/api/auth/logout", {})).status,
    200,
  );
  assert.equal((await investigator.agent.get("/api/auth/me")).status, 401);
});
test("seed and migration are idempotent", async () => {
  await migrate(db);
  await seed(db, cfg);
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM evidence"))[0].n,
    8,
  );
});
test("Vercel routes prioritize API and preserve nested SPA routing", async () => {
  const conf = JSON.parse(
    await readFile(new URL("../../vercel.json", import.meta.url), "utf8"),
  );
  assert.equal(conf.outputDirectory, "frontend/dist");
  assert.equal(conf.rewrites[0].source, "/api/:path*");
  assert.equal(conf.rewrites[0].destination, "/api/index");
  assert.equal(conf.rewrites[1].destination, "/index.html");
  const regex = new RegExp("^" + conf.rewrites[1].source + "$");
  assert.ok(regex.test("/workspace/board"));
  assert.equal(regex.test("/api/cases"), false);
  assert.equal(regex.test("/assets/index.js"), false);
  const r = await request(app).get("/api/not-a-route");
  assert.match(r.headers["content-type"], /json/);
});
test("annotations are encrypted and remain inside evidence policy", async () => {
  const r = await write(admin, "post", "/api/evidence/ev-05/annotations", {
    content: "Private synthetic annotation",
  });
  assert.equal(r.status, 201);
  const [stored] = await db.query(
    "SELECT envelope FROM case_annotations WHERE id=$1",
    [r.body.id],
  );
  assert.equal(JSON.stringify(stored).includes("Private synthetic"), false);
  assert.equal(
    (await outsider.agent.get("/api/evidence/ev-05/annotations")).status,
    401,
  );
  const list = await admin.agent.get("/api/evidence/ev-05/annotations");
  assert.equal(list.body[0].content, "Private synthetic annotation");
});
test("case creation, membership, evidence creation and archival are functional", async () => {
  let r = await write(admin, "post", "/api/cases", {
    title: "New synthetic case",
    description: "Testing the real workspace",
  });
  assert.equal(r.status, 201);
  const cid = r.body.id;
  r = await write(admin, "post", `/api/cases/${cid}/evidence`, {
    title: "New record",
    category: "DOCUMENT",
    classification: "INTERNAL",
    content: "Encrypted new evidence",
  });
  assert.equal(r.status, 201);
  const eid = r.body.id;
  assert.equal((await admin.agent.get(`/evidence/${eid}`)).status, 404);
  assert.equal(
    (await admin.agent.get(`/api/evidence/${eid}`)).body.content,
    "Encrypted new evidence",
  );
  r = await write(admin, "post", `/api/cases/${cid}/members`, {
    userId: "investigator",
    remove: false,
  });
  assert.equal(r.status, 200);
  r = await write(admin, "patch", `/api/cases/${cid}`, {
    title: "New synthetic case",
    description: "Archived",
    status: "ARCHIVED",
  });
  assert.equal(r.status, 200);
  r = await write(admin, "patch", `/api/evidence/${eid}`, {
    title: "New record",
    category: "DOCUMENT",
    classification: "INTERNAL",
    content: "Should fail",
    version: 1,
  });
  assert.equal(r.status, 409);
});
test("admin user management creates accounts and revokes sessions on disable", async () => {
  let r = await write(admin, "post", "/api/admin/users", {
    name: "New investigator",
    email: "new@example.test",
    password: "Test-only-password-2026",
    role: "INVESTIGATOR",
  });
  assert.equal(r.status, 201);
  const uid = r.body.id;
  const who = await login("new@example.test");
  assert.equal((await who.agent.get("/api/auth/me")).status, 200);
  r = await write(admin, "patch", `/api/admin/users/${uid}`, {
    role: "REVIEWER",
    active: false,
  });
  assert.equal(r.status, 200);
  assert.equal((await who.agent.get("/api/auth/me")).status, 401);
});
test("metadata category filters, sort and pagination are server-side", async () => {
  const r = await admin.agent.get(
    "/api/cases/case-074/evidence?category=DOCUMENT&classification=INTERNAL&sort=title&page=1",
  );
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 1);
  assert.equal(r.body[0].id, "ev-02");
  assert.equal(
    (await admin.agent.get("/api/cases/case-074/evidence?page=100")).body
      .length,
    0,
  );
  assert.equal(
    (await admin.agent.get("/api/cases/case-074/evidence?sort=DROP")).status,
    400,
  );
});
