// HTTP startup verification only. No real database or credentials are required.
import { spawn } from "node:child_process";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const children = [];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function portFree(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "localhost", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(true));
  });
}
function launch(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, PORT: "5000" },
    detached: process.platform !== "win32",
    shell: process.platform === "win32" && command === "npm.cmd",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  child.on("error", (e) => (output += e.message));
  children.push(child);
  return () => output;
}
async function ready(url, output) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(800) });
      if (r.ok) return r;
    } catch {}
    await pause(150);
  }
  throw Error("Startup failed at " + url + "\n" + output());
}
try {
  for (const port of [5000, 5173])
    if (!(await portFree(port)))
      throw Error(
        `Port ${port} is already in use. Stop your existing development server before running this check.`,
      );
  const back = launch(process.execPath, ["server.js"], root + "backend");
  const front = launch(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev"],
    root + "frontend",
  );
  const health = await (
    await ready("http://127.0.0.1:5000/api/health", back)
  ).json();
  assert.equal(health.ok, true);
  const page = await (await ready("http://localhost:5173/", front)).text();
  assert.match(page, /PARALLAX/);
  for (const path of ["/demo/board", "/workspace/settings"]) {
    const r = await fetch("http://localhost:5173" + path);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /id="root"/);
  }
  const api = await fetch("http://localhost:5173/api/demo");
  assert.match(api.headers.get("content-type"), /json/);
  const d = await api.json();
  assert.equal(d.evidence.length, 8);
  assert.equal(d.evidence.find((e) => e.id === "ev-05").content, undefined);
  const role = await fetch("http://localhost:5173/api/lab/roles");
  assert.equal((await role.json()).length, 3);
  const missing = await fetch("http://localhost:5173/api/not-a-route");
  assert.match(missing.headers.get("content-type"), /json/);
  assert.notEqual(missing.status, 200);
  console.log("PASS: backend node server.js starts on 5000");
  console.log("PASS: frontend npm run dev starts on 5173");
  console.log("PASS: nested SPA routes and same-origin API proxy");
  console.log("PASS: public data redaction and JSON API boundary");
  console.log(
    "Database authentication requires your Neon configuration; use npm test for isolated protected-flow checks.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  for (const child of children) {
    if (!child.pid) continue;
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      } else process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  await pause(300);
}
