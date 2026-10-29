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
  app.get("/api/cases/:cid/board", async (req, res) => {
    const c = req.params.cid;
    await caseAccess(req, c);
    res.json({
      positions: await q(
        "SELECT evidence_id,x,y FROM evidence_board_positions WHERE case_id=$1 AND user_id=$2",
        [c, req.user.id],
      ),
      connections: await q(
        "SELECT * FROM evidence_connections WHERE case_id=$1",
        [c],
      ),
    });
  });
  app.put("/api/cases/:cid/board", async (req, res) => {
    const c = req.params.cid;
    await caseAccess(req, c, true);
    const b = z
      .object({
        positions: z
          .array(
            z.object({
              id,
              x: z.number().finite().min(-100000).max(100000),
              y: z.number().finite().min(-100000).max(100000),
            }),
          )
          .max(300),
        connections: z
          .array(z.object({ source: id, target: id, label: text.max(100) }))
          .max(500),
      })
      .parse(req.body);
    const existing = await q("SELECT id FROM evidence WHERE case_id=$1", [c]);
    const ids = new Set(existing.map((e) => e.id));
    if (
      b.positions.some((p) => !ids.has(p.id)) ||
      b.connections.some(
        (e) =>
          e.source === e.target || !ids.has(e.source) || !ids.has(e.target),
      )
    )
      fail(400, "Invalid case evidence");
    await batch([
      [
        "DELETE FROM evidence_board_positions WHERE case_id=$1 AND user_id=$2",
        [c, req.user.id],
      ],
      ...b.positions.map((p) => [
        "INSERT INTO evidence_board_positions VALUES($1,$2,$3,$4,$5)",
        [c, req.user.id, p.id, p.x, p.y],
      ]),
      ["DELETE FROM evidence_connections WHERE case_id=$1", [c]],
      ...b.connections.map((e) => [
        "INSERT INTO evidence_connections VALUES($1,$2,$3,$4,$5)",
        [randomUUID(), c, e.source, e.target, e.label],
      ]),
      audit(req.user, "BOARD_SAVED", c),
    ]);
    res.json({ ok: true });
  });
}
