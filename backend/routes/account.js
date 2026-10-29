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
  app.get("/api/auth/me", (req, res) =>
    res.json({ user: pickUser(req.user), csrf: req.user.csrf }),
  );
  app.post("/api/auth/logout", async (req, res) => {
    await batch([
      ["DELETE FROM user_sessions WHERE token_hash=$1", [req.user.token_hash]],
      audit(req.user, "LOGOUT"),
    ]);
    res.clearCookie("parallax_session", { path: "/" }).json({ ok: true });
  });
  app.patch("/api/profile", async (req, res) => {
    const b = z.object({ name: text.max(100) }).parse(req.body);
    await q("UPDATE users SET name=$1 WHERE id=$2", [b.name, req.user.id]);
    res.json({ ok: true });
  });
  app.post("/api/profile/password", async (req, res) => {
    const b = z
      .object({
        current: z.string().max(200),
        password: z.string().min(12).max(200),
      })
      .parse(req.body);
    if (!(await checkPassword(b.current, req.user.password_hash)))
      fail(403, "Current password is incorrect");
    await batch([
      [
        "UPDATE users SET password_hash=$1 WHERE id=$2",
        [await hashPassword(b.password), req.user.id],
      ],
      ["DELETE FROM user_sessions WHERE user_id=$1", [req.user.id]],
      audit(req.user, "PASSWORD_CHANGED"),
    ]);
    res.clearCookie("parallax_session", { path: "/" }).json({ ok: true });
  });
}
