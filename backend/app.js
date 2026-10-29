import { register as register_account } from "./routes/account.js";
import { register as register_cases } from "./routes/cases.js";
import { register as register_evidence } from "./routes/evidence.js";
import { register as register_board } from "./routes/board.js";
import { register as register_access } from "./routes/access.js";
import { register as register_activity } from "./routes/activity.js";
import { register as register_labs } from "./routes/labs.js";
import { register as register_guided } from "./routes/guided.js";
import { register as register_administration } from "./routes/administration.js";
import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { database } from "./db/client.js";
import { config } from "./config.js";
import {
  seal,
  unseal,
  integrity,
  sign,
  hashPassword,
  checkPassword,
} from "./security/crypto.js";
import { decision } from "./security/policy.js";
import { publicStory } from "./services/story.js";
import { id, fail } from "./security/validation.js";
export function createApp(injectedDb, injectedConfig) {
  const app = express();
  const cfg = () => injectedConfig || config();
  const db = () => injectedDb || database();
  const q = (sql, params = []) => db().query(sql, params);
  const batch = (items) => db().batch(items);
  const audit = (u, action, c = null, e = null) => [
    "INSERT INTO audit_logs(id,user_id,case_id,evidence_id,action) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), u?.id || null, c, e, action],
  ];
  const log = async (...args) => {
    const [s, p] = audit(...args);
    await q(s, p);
  };
  const mark = (u, c, chapter) => [
    "INSERT INTO investigation_progress(user_id,case_id,chapter) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [u.id, c, chapter],
  ];
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "64kb" }));
  app.use("/api", (_, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", (_, res) =>
    res.json({
      ok: true,
      service: "PARALLAX",
      databaseConfigured: !!process.env.DATABASE_URL,
    }),
  );
  app.get("/api/demo", (_, res) => res.json(publicStory()));
  app.get("/api/lab/roles", (_, res) =>
    res.json(
      ["ADMIN", "INVESTIGATOR", "REVIEWER"].map((r) => ({
        role: r,
        decision: decision(
          { id: "synthetic-user", role: r },
          true,
          {
            id: "synthetic-record",
            case_id: "synthetic-case",
            classification: "RESTRICTED",
          },
          null,
        ),
      })),
    ),
  );
  // Origin validation is mandatory for every mutating request, including login.
  app.use("/api", (req, _, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== cfg().origin
    )
      fail(403, "Origin rejected");
    next();
  });
  async function rate(bucket, max = 12) {
    const rows = await q(
      `INSERT INTO rate_limits(bucket,hits,expires_at) VALUES($1,1,now()+interval '10 minutes') ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END,expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+interval '10 minutes' ELSE rate_limits.expires_at END RETURNING hits`,
      [bucket],
    );
    if (rows[0].hits > max)
      fail(429, "Too many attempts. Try again in ten minutes.");
  }
  app.post("/api/auth/login", async (req, res) => {
    const b = z
      .object({
        email: z
          .string()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        password: z.string().min(1).max(200),
      })
      .parse(req.body);
    await rate(`login:${sign(b.email, cfg().session)}`);
    const [u] = await q("SELECT * FROM users WHERE email=$1 AND active=true", [
      b.email,
    ]);
    const valid = await checkPassword(
      b.password,
      u?.password_hash || (await hashPassword("dummy-account-password")),
    );
    if (!u || !valid) {
      await log(null, "LOGIN_FAILED");
      fail(401, "Invalid email or password");
    }
    const token = randomBytes(32).toString("hex"),
      csrf = randomBytes(24).toString("hex");
    await batch([
      [
        "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",
        [sign(token, cfg().session), u.id, csrf],
      ],
      audit(u, "LOGIN"),
    ]);
    res.cookie("parallax_session", token, {
      httpOnly: true,
      secure: cfg().production,
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({ user: pickUser(u), csrf });
  });
  function pickUser(u) {
    return { id: u.id, name: u.name, email: u.email, role: u.role };
  }
  app.use("/api", async (req, _, next) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("parallax_session="))
      ?.split("=")[1];
    if (!token) fail(401, "Please sign in");
    const [u] = await q(
      "SELECT u.*,s.csrf,s.token_hash FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true",
      [sign(token, cfg().session)],
    );
    if (!u) fail(401, "Your session has expired");
    req.user = u;
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("x-csrf-token") !== u.csrf
    )
      fail(403, "CSRF token rejected");
    next();
  });
  const admin = (req) => {
    if (req.user.role !== "ADMIN")
      fail(403, "Administrator permission required");
  };
  const writer = (req) => {
    if (!["ADMIN", "INVESTIGATOR"].includes(req.user.role))
      fail(403, "Read-only role");
  };
  async function caseAccess(req, c, write = false) {
    id.parse(c);
    const [row] = await q(
      "SELECT c.* FROM cases c WHERE c.id=$1 AND ($2='ADMIN' OR EXISTS(SELECT 1 FROM case_memberships m WHERE m.case_id=c.id AND m.user_id=$3))",
      [c, req.user.role, req.user.id],
    );
    if (!row) fail(404, "Case not found");
    if (write) {
      writer(req);
      if (row.status === "ARCHIVED") fail(409, "Archived cases are read-only");
    }
    return row;
  }
  async function policy(req, eid) {
    id.parse(eid);
    const [e] = await q("SELECT * FROM evidence WHERE id=$1", [eid]);
    if (!e) fail(404, "Record not found");
    await caseAccess(req, e.case_id);
    const grants = await q(
      "SELECT * FROM evidence_access_grants WHERE user_id=$1 AND evidence_id=$2 AND case_id=$3 AND revoked=false AND expires_at>now()",
      [req.user.id, e.id, e.case_id],
    );
    return { e, p: decision(req.user, true, e, grants[0]) };
  }
  async function readable(req, eid) {
    const a = await policy(req, eid);
    if (!a.p.allowed) {
      await log(req.user, "ACCESS_DENIED", a.e.case_id, eid);
      fail(403, "Current clearance does not authorize this record");
    }
    return a.e;
  }
  const context = {
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
  };
  register_account(app, context);
  register_cases(app, context);
  register_evidence(app, context);
  register_board(app, context);
  register_access(app, context);
  register_activity(app, context);
  register_labs(app, context);
  register_guided(app, context);
  register_administration(app, context);
  app.use("/api", (_, res) =>
    res.status(404).json({ error: "API endpoint not found" }),
  );
  app.use((err, req, res, _next) => {
    const status =
      err instanceof z.ZodError
        ? 400
        : err.status ||
          (["23505", "23503", "23514"].includes(err.code) ? 409 : 500);
    if (status === 500)
      console.error("Request failed", {
        method: req.method,
        path: req.path,
        code: err.code || "internal",
      });
    res.status(status).json({
      error:
        status === 500
          ? "Unable to complete request"
          : err instanceof z.ZodError
            ? "Invalid request fields"
            : status === 409 && err.code
              ? "Conflicting or invalid record"
              : err.message,
    });
  });
  return app;
}
export default createApp();
