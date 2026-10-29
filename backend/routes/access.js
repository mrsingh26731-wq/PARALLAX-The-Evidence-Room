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
  app.post("/api/evidence/:eid/requests", async (req, res) => {
    const { e } = await policy(req, req.params.eid);
    const b = z.object({ reason: text.max(1000) }).parse(req.body);
    await batch([
      [
        "INSERT INTO evidence_access_requests(id,case_id,user_id,evidence_id,reason) VALUES($1,$2,$3,$4,$5)",
        [randomUUID(), e.case_id, req.user.id, e.id, b.reason],
      ],
      audit(req.user, "ACCESS_REQUESTED", e.case_id, e.id),
    ]);
    res.status(201).json({ ok: true });
  });
  app.get("/api/requests", async (req, res) =>
    res.json(
      await q(
        "SELECT r.*,e.title,u.name FROM evidence_access_requests r JOIN evidence e ON e.id=r.evidence_id JOIN users u ON u.id=r.user_id WHERE $1='ADMIN' OR r.user_id=$2 ORDER BY r.created_at DESC",
        [req.user.role, req.user.id],
      ),
    ),
  );
  app.post("/api/requests/:rid/review", async (req, res) => {
    admin(req);
    const b = z
      .object({ approve: z.boolean(), hours: z.number().int().min(1).max(72) })
      .parse(req.body);
    const [r] = await q("SELECT * FROM evidence_access_requests WHERE id=$1", [
      req.params.rid,
    ]);
    if (!r) fail(404, "Request not found");
    if (r.user_id === req.user.id)
      fail(403, "A different administrator must review your request");
    const rows = await batch([
      [
        `WITH reviewed AS (UPDATE evidence_access_requests SET status=$1,reviewer_id=$2 WHERE id=$3 AND status='PENDING' RETURNING *) INSERT INTO evidence_access_grants(id,case_id,user_id,evidence_id,expires_at,approved_by,revoked) SELECT $4,case_id,user_id,evidence_id,now()+($5::int * interval '1 hour'),$2,$6 FROM reviewed RETURNING id`,
        [
          b.approve ? "APPROVED" : "REJECTED",
          req.user.id,
          r.id,
          randomUUID(),
          b.hours,
          !b.approve,
        ],
      ],
      audit(
        req.user,
        b.approve ? "ACCESS_APPROVED" : "ACCESS_REJECTED",
        r.case_id,
        r.evidence_id,
      ),
    ]);
    if (!rows[0].length) fail(409, "Request already reviewed");
    res.json({ ok: true });
  });
  app.get("/api/grants", async (req, res) => {
    admin(req);
    res.json(
      await q(
        "SELECT g.*,u.name,e.title FROM evidence_access_grants g JOIN users u ON u.id=g.user_id JOIN evidence e ON e.id=g.evidence_id ORDER BY expires_at DESC",
      ),
    );
  });
  app.post("/api/grants/:gid/revoke", async (req, res) => {
    admin(req);
    const [g] = await q("SELECT * FROM evidence_access_grants WHERE id=$1", [
      req.params.gid,
    ]);
    if (!g) fail(404, "Grant not found");
    await batch([
      ["UPDATE evidence_access_grants SET revoked=true WHERE id=$1", [g.id]],
      audit(req.user, "GRANT_REVOKED", g.case_id, g.evidence_id),
    ]);
    res.json({ ok: true });
  });
}
