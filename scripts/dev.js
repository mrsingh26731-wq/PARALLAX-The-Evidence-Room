import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["backend/server.js"], { stdio: "inherit" }),
  spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--config",
      "frontend/vite.config.js",
      "frontend",
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  ),
];
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    children.forEach((c) => c.kill(signal));
    process.exit(0);
  });
