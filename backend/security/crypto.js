import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  scrypt as rawScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(rawScrypt);
export const digest = (text) => createHash("sha256").update(text).digest("hex");
export const sign = (text, key) =>
  createHmac("sha256", key).update(text).digest("hex");
export function seal(text, key, context = "") {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  c.setAAD(Buffer.from(context));
  return {
    v: 1,
    alg: "AES-256-GCM",
    iv: iv.toString("base64"),
    ciphertext: Buffer.concat([c.update(text, "utf8"), c.final()]).toString(
      "base64",
    ),
    tag: c.getAuthTag().toString("base64"),
  };
}
export function unseal(e, key, context = "") {
  if (e.v !== 1 || e.alg !== "AES-256-GCM")
    throw Error("Unsupported ciphertext");
  const d = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(e.iv, "base64"),
  );
  d.setAAD(Buffer.from(context));
  d.setAuthTag(Buffer.from(e.tag, "base64"));
  return Buffer.concat([
    d.update(Buffer.from(e.ciphertext, "base64")),
    d.final(),
  ]).toString("utf8");
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const h = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${salt}$${h.toString("hex")}`;
}
export async function checkPassword(password, stored) {
  const [alg, salt, h] = stored.split("$");
  if (alg !== "scrypt") return false;
  const got = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(got, Buffer.from(h, "hex"));
}
export function integrity(text, evidenceId, version, key) {
  const hash = digest(text);
  return { digest: hash, mac: sign(`${evidenceId}:${version}:${hash}`, key) };
}
