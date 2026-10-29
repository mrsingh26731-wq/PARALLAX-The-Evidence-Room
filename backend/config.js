import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
dotenv.config({
  path: fileURLToPath(new URL(".env", import.meta.url)),
  quiet: true,
});
export function config() {
  const c = {
    database: process.env.DATABASE_URL,
    key: process.env.ENCRYPTION_KEY,
    integrity: process.env.INTEGRITY_KEY,
    session: process.env.SESSION_SECRET,
    origin: process.env.APP_ORIGIN || "http://localhost:5173",
    production: process.env.NODE_ENV === "production",
  };
  if (
    !c.database ||
    !/^[a-f0-9]{64}$/i.test(c.key || "") ||
    !/^[a-f0-9]{64}$/i.test(c.integrity || "") ||
    (c.session || "").length < 32
  )
    throw Object.assign(
      new Error(
        "Database and secrets are not configured. Follow README setup.",
      ),
      { status: 503 },
    );
  return c;
}
