import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { database } from "./client.js";
import { config } from "../config.js";
import { hashPassword, seal, integrity } from "../security/crypto.js";
import { story, documents, timeline, connections } from "../services/story.js";
export async function migrate(db) {
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz DEFAULT now())",
  );
  const done = await db.query(
    "SELECT version FROM schema_migrations WHERE version=$1",
    ["001"],
  );
  if (done.length) return;
  const sql = await readFile(
    new URL("./migrations/001_initial.sql", import.meta.url),
    "utf8",
  );
  await db.batch([
    ...sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => [s, []]),
    ["INSERT INTO schema_migrations(version) VALUES($1)", ["001"]],
  ]);
}
export async function seed(db, cfg) {
  const exists = await db.query("SELECT id FROM cases WHERE id=$1", [story.id]);
  if (exists.length) return;
  const items = [
    [
      "INSERT INTO cases(id,title,description) VALUES($1,$2,$3)",
      [story.id, story.title, story.description],
    ],
  ];
  for (const e of documents) {
    const p = integrity(e.content, e.id, 1, cfg.integrity);
    items.push(
      [
        "INSERT INTO evidence(id,case_id,title,category,classification) VALUES($1,$2,$3,$4,$5)",
        [e.id, e.case_id, e.title, e.category, e.classification],
      ],
      [
        "INSERT INTO evidence_versions(evidence_id,version,envelope,digest,mac) VALUES($1,1,$2,$3,$4)",
        [e.id, seal(e.content, cfg.key, `${e.id}:1`), p.digest, p.mac],
      ],
    );
  }
  for (const e of connections)
    items.push([
      "INSERT INTO evidence_connections VALUES($1,$2,$3,$4,$5)",
      [e.id, e.case_id, e.source, e.target, e.label],
    ]);
  for (const t of timeline)
    items.push([
      "INSERT INTO case_timeline_events(id,case_id,evidence_id,title,description,occurred_at) VALUES($1,$2,$3,$4,$5,$6)",
      [t.id, t.case_id, t.evidence_id, t.title, t.description, t.occurred_at],
    ]);
  await db.batch(items);
}
if (
  process.argv[1]?.endsWith("/setup.js") ||
  process.argv[1]?.endsWith("\\setup.js")
) {
  try {
    const db = database(),
      c = config(),
      cmd = process.argv[2];
    if (cmd === "migrate") await migrate(db);
    else if (cmd === "seed") await seed(db, c);
    else if (cmd === "admin") {
      const email = process.env.ADMIN_EMAIL,
        password = process.env.ADMIN_PASSWORD;
      if (!email?.includes("@") || !password || password.length < 12)
        throw Error(
          "Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in your local environment",
        );
      const rows = await db.query("SELECT id FROM users WHERE role=$1", [
        "ADMIN",
      ]);
      if (rows.length)
        throw Error("An administrator already exists. Use user management.");
      await db.query(
        "WITH initialized AS (INSERT INTO admin_bootstrap(singleton) VALUES(true) ON CONFLICT DO NOTHING RETURNING singleton) INSERT INTO users(id,email,name,password_hash,role) SELECT $1,$2,$3,$4,'ADMIN' FROM initialized WHERE NOT EXISTS(SELECT 1 FROM users WHERE role='ADMIN')",
        [
          randomUUID(),
          email.toLowerCase(),
          "Archive Administrator",
          await hashPassword(password),
        ],
      );
    } else throw Error("Choose migrate, seed, or admin");
    console.log("Completed:", cmd);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
