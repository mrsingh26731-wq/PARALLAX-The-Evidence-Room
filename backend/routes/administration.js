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
  app.get("/api/admin/users", async (req, res) => {
    admin(req);
    res.json(
      await q("SELECT id,name,email,role,active FROM users ORDER BY name"),
    );
  });
  app.post("/api/admin/users", async (req, res) => {
    admin(req);
    const b = z
      .object({
        name: text.max(100),
        email: z.string().email().max(254),
        password: z.string().min(12).max(200),
        role,
      })
      .parse(req.body);
    const uid = randomUUID();
    await batch([
      [
        "INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)",
        [
          uid,
          b.name,
          b.email.toLowerCase(),
          await hashPassword(b.password),
          b.role,
        ],
      ],
      audit(req.user, "USER_CREATED"),
    ]);
    res.status(201).json({ id: uid });
  });
  app.patch("/api/admin/users/:uid", async (req, res) => {
    admin(req);
    if (req.params.uid === req.user.id)
      fail(403, "Cannot change your own role or active status");
    const b = z.object({ role, active: z.boolean() }).parse(req.body);
    await batch([
      [
        "UPDATE users SET role=$1,active=$2 WHERE id=$3",
        [b.role, b.active, req.params.uid],
      ],
      ["DELETE FROM user_sessions WHERE user_id=$1", [req.params.uid]],
      audit(req.user, "USER_ROLE_UPDATED"),
    ]);
    res.json({ ok: true });
  });
  app.get("/api/cases/:cid/members", async (req, res) => {
    admin(req);
    await caseAccess(req, req.params.cid);
    res.json(
      await q(
        "SELECT u.id,u.name,u.email FROM users u JOIN case_memberships m ON m.user_id=u.id WHERE m.case_id=$1",
        [req.params.cid],
      ),
    );
  });
  app.post("/api/cases/:cid/members", async (req, res) => {
    admin(req);
    await caseAccess(req, req.params.cid);
    const b = z
      .object({ userId: id, remove: z.boolean().default(false) })
      .parse(req.body);
    await batch([
      [
        b.remove
          ? "DELETE FROM case_memberships WHERE case_id=$1 AND user_id=$2"
          : "INSERT INTO case_memberships(case_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [req.params.cid, b.userId],
      ],
      audit(
        req.user,
        b.remove ? "MEMBERSHIP_REMOVED" : "MEMBERSHIP_ADDED",
        req.params.cid,
      ),
    ]);
    res.json({ ok: true });
  });
}
