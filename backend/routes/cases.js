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
  app.get("/api/cases", async (req, res) =>
    res.json(
      await q(
        "SELECT c.* FROM cases c WHERE $1='ADMIN' OR EXISTS(SELECT 1 FROM case_memberships m WHERE m.case_id=c.id AND m.user_id=$2) ORDER BY c.created_at DESC",
        [req.user.role, req.user.id],
      ),
    ),
  );
  app.post("/api/cases", async (req, res) => {
    writer(req);
    const b = z
      .object({ title: text.max(160), description: text })
      .parse(req.body);
    const c = randomUUID();
    await batch([
      [
        "INSERT INTO cases(id,title,description,created_by) VALUES($1,$2,$3,$4)",
        [c, b.title, b.description, req.user.id],
      ],
      ["INSERT INTO case_memberships VALUES($1,$2)", [c, req.user.id]],
      audit(req.user, "CASE_CREATED", c),
    ]);
    res.status(201).json({ id: c });
  });
  app.get("/api/cases/:cid", async (req, res) =>
    res.json(await caseAccess(req, req.params.cid)),
  );
  app.patch("/api/cases/:cid", async (req, res) => {
    const c = req.params.cid;
    await caseAccess(req, c, true);
    const b = z
      .object({
        title: text.max(160),
        description: text,
        status: z.enum(["OPEN", "ARCHIVED"]),
      })
      .parse(req.body);
    await batch([
      [
        "UPDATE cases SET title=$1,description=$2,status=$3 WHERE id=$4",
        [b.title, b.description, b.status, c],
      ],
      audit(req.user, "CASE_UPDATED", c),
    ]);
    res.json({ ok: true });
  });
}
