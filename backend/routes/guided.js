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
  app.get("/api/cases/:cid/progress", async (req, res) => {
    await caseAccess(req, req.params.cid);
    res.json(
      await q(
        "SELECT chapter,completed_at FROM investigation_progress WHERE user_id=$1 AND case_id=$2 ORDER BY chapter",
        [req.user.id, req.params.cid],
      ),
    );
  });
  app.post("/api/cases/:cid/check", async (req, res) => {
    const c = req.params.cid;
    await caseAccess(req, c);
    if (c !== "case-074") fail(400, "Guided mode belongs to Case 074");
    const b = z
      .object({
        answer: z.enum([
          "key-outside-database",
          "base64",
          "hash-is-encryption",
        ]),
      })
      .parse(req.body);
    if (b.answer !== "key-outside-database")
      fail(422, "Review the encryption exhibit: where is the key held?");
    const done = await q(
      "SELECT id FROM audit_logs WHERE user_id=$1 AND action='SYNTHETIC_DECRYPT'",
      [req.user.id],
    );
    if (!done.length)
      fail(409, "Recover the synthetic exhibit in the Cipher Room first");
    await batch([mark(req.user, c, 4)]);
    res.json({ ok: true });
  });
  app.post("/api/cases/:cid/verdict", async (req, res) => {
    const c = req.params.cid;
    await caseAccess(req, c);
    const b = z
      .object({
        conclusion: text.max(4000),
        finding: z.enum(["reclassified", "exfiltrated", "deleted"]),
      })
      .parse(req.body);
    const p = await q(
      "SELECT chapter FROM investigation_progress WHERE user_id=$1 AND case_id=$2",
      [req.user.id, c],
    );
    if (
      c !== "case-074" ||
      ![1, 2, 3, 4].every((n) => p.some((x) => x.chapter === n))
    )
      fail(409, "Finish chapters 1–4 first");
    if (b.finding !== "reclassified")
      fail(
        422,
        "The access ledger and witness evidence do not support that conclusion",
      );
    await batch([
      [
        "INSERT INTO investigation_findings(id,user_id,case_id,conclusion_envelope) VALUES($1,$2,$3,$4)",
        [
          randomUUID(),
          req.user.id,
          c,
          seal(b.conclusion, cfg().key, `${req.user.id}:${c}`),
        ],
      ],
      mark(req.user, c, 5),
      audit(req.user, "VERDICT_SUBMITTED", c),
    ]);
    res.json({ ok: true });
  });
  app.get("/api/cases/:cid/report", async (req, res) => {
    const c = req.params.cid;
    const row = await caseAccess(req, c);
    const es = await q("SELECT * FROM evidence WHERE case_id=$1", [c]);
    const records = [];
    for (const e of es) {
      const { p } = await policy(req, e.id);
      if (p.allowed) {
        const [v] = await q(
          "SELECT envelope FROM evidence_versions WHERE evidence_id=$1 AND version=$2",
          [e.id, e.version],
        );
        records.push({
          ...e,
          content: unseal(v.envelope, cfg().key, `${e.id}:${e.version}`),
        });
      } else
        records.push({
          id: e.id,
          title: e.title,
          classification: e.classification,
          content: "[REDACTED — insufficient clearance]",
        });
    }
    const findings = await q(
      "SELECT conclusion_envelope,created_at FROM investigation_findings WHERE user_id=$1 AND case_id=$2 ORDER BY created_at DESC LIMIT 1",
      [req.user.id, c],
    );
    await log(req.user, "REPORT_EXPORTED", c);
    res.json({
      case: row,
      records,
      fictional: c === "case-074",
      generatedAt: new Date().toISOString(),
      conclusion: findings[0]
        ? unseal(
            findings[0].conclusion_envelope,
            cfg().key,
            `${req.user.id}:${c}`,
          )
        : null,
    });
  });
}
