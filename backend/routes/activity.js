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
  app.get("/api/cases/:cid/timeline", async (req, res) => {
    await caseAccess(req, req.params.cid);
    res.json(
      await q(
        "SELECT * FROM case_timeline_events WHERE case_id=$1 ORDER BY occurred_at",
        [req.params.cid],
      ),
    );
  });
  app.get("/api/cases/:cid/audit", async (req, res) => {
    await caseAccess(req, req.params.cid);
    if (req.user.role === "REVIEWER")
      fail(403, "Audit access requires investigator permission");
    res.json(
      await q(
        "SELECT a.*,u.name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE case_id=$1 ORDER BY created_at DESC LIMIT 200",
        [req.params.cid],
      ),
    );
  });
}
