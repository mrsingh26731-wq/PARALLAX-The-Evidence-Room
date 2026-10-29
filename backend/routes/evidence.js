import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import {
  seal,
  unseal,
  integrity,
  sign,
  hashPassword,
  checkPassword,
} from "../security/crypto.js";
import { id, text, role, evidenceInput, fail } from "../security/validation.js";
export function register(
  app,
  {
    cfg,
    q,
    batch,
    audit,
    log,
    mark,
    caseAccess,
    readable,
    policy,
    writer,
    admin,
    pickUser,
    rate,
  },
) {
  app.get("/api/cases/:cid/evidence", async (req, res) => {
    const c = req.params.cid;
    await caseAccess(req, c);
    const b = z
      .object({
        search: z.string().max(160).default(""),
        classification: z
          .enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", ""])
          .default(""),
        category: z
          .enum([
            "",
            "DOCUMENT",
            "PERSON",
            "EVENT",
            "ACCESS",
            "DATABASE",
            "FINDING",
          ])
          .default(""),
        page: z.coerce.number().int().min(1).max(10000).default(1),
        sort: z.enum(["title", "created_at"]).default("created_at"),
      })
      .parse(req.query);
    const sort = b.sort === "title" ? "e.title" : "e.created_at";
    const rows = await q(
      `SELECT e.*, count(*) OVER()::int AS total FROM evidence e WHERE e.case_id=$1 AND e.title ILIKE $2 AND ($3='' OR e.classification=$3) AND ($5='' OR e.category=$5) ORDER BY ${sort},e.id LIMIT 30 OFFSET $4`,
      [
        c,
        "%" + b.search + "%",
        b.classification,
        (b.page - 1) * 30,
        b.category,
      ],
    );
    res.json(rows);
  });
  app.post("/api/cases/:cid/evidence", async (req, res) => {
    const c = req.params.cid;
    await caseAccess(req, c, true);
    const b = evidenceInput.parse(req.body);
    if (b.classification === "RESTRICTED") admin(req);
    const e = randomUUID(),
      proof = integrity(b.content, e, 1, cfg().integrity);
    await batch([
      [
        "INSERT INTO evidence(id,case_id,title,category,classification,created_by) VALUES($1,$2,$3,$4,$5,$6)",
        [e, c, b.title, b.category, b.classification, req.user.id],
      ],
      [
        "INSERT INTO evidence_versions VALUES($1,1,$2,$3,$4,$5,now())",
        [
          e,
          seal(b.content, cfg().key, `${e}:1`),
          proof.digest,
          proof.mac,
          req.user.id,
        ],
      ],
      audit(req.user, "EVIDENCE_CREATED", c, e),
    ]);
    res.status(201).json({ id: e });
  });
  app.get("/api/evidence/:eid/decision", async (req, res) => {
    const { e, p } = await policy(req, req.params.eid);
    await batch([
      audit(
        req.user,
        p.allowed ? "ACCESS_EVALUATED" : "ACCESS_DENIED",
        e.case_id,
        e.id,
      ),
      ...(e.case_id === "case-074" && e.id === "ev-05"
        ? [mark(req.user, e.case_id, 2)]
        : []),
    ]);
    res.json(p);
  });
  app.get("/api/evidence/:eid", async (req, res) => {
    const e = await readable(req, req.params.eid);
    const [v] = await q(
      "SELECT * FROM evidence_versions WHERE evidence_id=$1 AND version=$2",
      [e.id, e.version],
    );
    const content = unseal(v.envelope, cfg().key, `${e.id}:${e.version}`);
    await batch([
      audit(req.user, "DECRYPT_READ", e.case_id, e.id),
      ...(e.id === "ev-01" && e.case_id === "case-074"
        ? [mark(req.user, e.case_id, 1)]
        : []),
    ]);
    res.json({ ...e, content, digest: v.digest });
  });
  app.patch("/api/evidence/:eid", async (req, res) => {
    const e = await readable(req, req.params.eid);
    await caseAccess(req, e.case_id, true);
    const b = evidenceInput
      .extend({ version: z.number().int().positive() })
      .parse(req.body);
    if (b.classification !== e.classification) admin(req);
    const n = b.version + 1,
      proof = integrity(b.content, e.id, n, cfg().integrity);
    const results = await batch([
      [
        `WITH updated AS (UPDATE evidence SET title=$1,category=$2,classification=$3,version=version+1 WHERE id=$4 AND version=$5 RETURNING id,version) INSERT INTO evidence_versions(evidence_id,version,envelope,digest,mac,author_id) SELECT id,version,$6,$7,$8,$9 FROM updated RETURNING version`,
        [
          b.title,
          b.category,
          b.classification,
          e.id,
          b.version,
          seal(b.content, cfg().key, `${e.id}:${n}`),
          proof.digest,
          proof.mac,
          req.user.id,
        ],
      ],
      audit(req.user, "EVIDENCE_UPDATE_ATTEMPT", e.case_id, e.id),
    ]);
    if (!results[0].length) fail(409, "Record changed. Reload before editing.");
    await log(req.user, "EVIDENCE_UPDATED", e.case_id, e.id);
    res.json({ version: n });
  });
  app.get("/api/evidence/:eid/history", async (req, res) => {
    const e = await readable(req, req.params.eid);
    const rows = await q(
      "SELECT v.*,u.name AS author FROM evidence_versions v LEFT JOIN users u ON u.id=v.author_id WHERE evidence_id=$1 ORDER BY version DESC",
      [e.id],
    );
    await log(req.user, "HISTORY_READ", e.case_id, e.id);
    res.json(
      rows.map((v) => ({
        version: v.version,
        author: v.author,
        created_at: v.created_at,
        digest: v.digest,
        content: unseal(v.envelope, cfg().key, `${e.id}:${v.version}`),
      })),
    );
  });
  app.post("/api/evidence/:eid/verify", async (req, res) => {
    const e = await readable(req, req.params.eid);
    const [v] = await q(
      "SELECT * FROM evidence_versions WHERE evidence_id=$1 AND version=$2",
      [e.id, e.version],
    );
    let proof = { digest: null, mac: null },
      valid = false;
    try {
      proof = integrity(
        unseal(v.envelope, cfg().key, `${e.id}:${e.version}`),
        e.id,
        e.version,
        cfg().integrity,
      );
      valid = proof.digest === v.digest && proof.mac === v.mac;
    } catch {}
    await log(
      req.user,
      valid ? "INTEGRITY_VERIFIED" : "INTEGRITY_FAILED",
      e.case_id,
      e.id,
    );
    res.json({
      valid,
      version: e.version,
      storedDigest: v.digest,
      calculatedDigest: proof.digest,
      explanation:
        "Checks authenticated ciphertext and keyed digest. Does not prove source truth or prevent rollback by a privileged operator.",
    });
  });
  app.get("/api/evidence/:eid/annotations", async (req, res) => {
    const e = await readable(req, req.params.eid);
    const rows = await q(
      "SELECT a.*,u.name FROM case_annotations a JOIN users u ON u.id=a.user_id WHERE evidence_id=$1 ORDER BY created_at",
      [e.id],
    );
    await log(req.user, "ANNOTATIONS_READ", e.case_id, e.id);
    res.json(
      rows.map((a) => ({
        id: a.id,
        name: a.name,
        created_at: a.created_at,
        content: unseal(a.envelope, cfg().key, `${e.id}:annotation:${a.id}`),
      })),
    );
  });
  app.post("/api/evidence/:eid/annotations", async (req, res) => {
    const e = await readable(req, req.params.eid);
    await caseAccess(req, e.case_id, true);
    const b = z.object({ content: text.max(2000) }).parse(req.body);
    const aid = randomUUID();
    await batch([
      [
        "INSERT INTO case_annotations(id,evidence_id,user_id,envelope) VALUES($1,$2,$3,$4)",
        [
          aid,
          e.id,
          req.user.id,
          seal(b.content, cfg().key, `${e.id}:annotation:${aid}`),
        ],
      ],
      audit(req.user, "ANNOTATION_ADDED", e.case_id, e.id),
    ]);
    res.status(201).json({ id: aid });
  });
}
