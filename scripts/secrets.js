import { randomBytes } from "node:crypto";
for (const k of ["ENCRYPTION_KEY", "INTEGRITY_KEY", "SESSION_SECRET"])
  console.log(`${k}=${randomBytes(32).toString("hex")}`);
