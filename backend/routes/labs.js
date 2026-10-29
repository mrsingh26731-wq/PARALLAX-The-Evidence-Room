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
  app.post("/api/lab/query", async (req, res) => {
    const b = z.object({ input: z.string().max(160) }).parse(req.body);
    await rate(`query:${req.user.id}`, 120);
    const rows = await q("SELECT id,label FROM demo_records WHERE label=$1", [
      b.input,
    ]);
    const actions = [audit(req.user, "PARAMETERIZED_QUERY")];
    if (b.input.includes("'")) {
      const cases = await q(
        "SELECT id FROM cases WHERE id=$1 AND ($2='ADMIN' OR EXISTS(SELECT 1 FROM case_memberships WHERE case_id=$1 AND user_id=$3))",
        ["case-074", req.user.role, req.user.id],
      );
      if (cases.length) actions.push(mark(req.user, "case-074", 3));
    }
    await batch(actions);
    res.json({
      query: "SELECT id, label FROM demo_records WHERE label = $1",
      parameters: [b.input],
      rows,
    });
  });
  app.post("/api/lab/cipher", async (req, res) => {
    const b = z
      .object({ tamper: z.boolean().default(false) })
      .parse(req.body || {});
    await rate(`cipher:${req.user.id}`, 120);
    const plaintext =
      "SYNTHETIC EXHIBIT — The archive key is held by the application, never the database.";
    const envelope = seal(plaintext, cfg().key, "synthetic");
    const target = b.tamper
      ? { ...envelope, tag: Buffer.alloc(16).toString("base64") }
      : envelope;
    let recovered = null;
    try {
      recovered = unseal(target, cfg().key, "synthetic");
    } catch {}
    await log(
      req.user,
      b.tamper ? "SYNTHETIC_TAG_REJECTED" : "SYNTHETIC_DECRYPT",
    );
    res.json({
      plaintext,
      envelope,
      recovered,
      verified: recovered !== null,
      synthetic: true,
    });
  });
}
