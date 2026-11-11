import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const npm = path.join(
  path.dirname(process.execPath),
  "node_modules/npm/bin/npm-cli.js",
);
const results = [];
for (const task of ["typecheck", "lint", "test", "build"]) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [npm, "run", task], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 180000,
    env: {
      ...process.env,
      TEMP: "E:/near-2/.tmp",
      TMP: "E:/near-2/.tmp",
      npm_config_cache: "E:/near-2/.npm-cache",
    },
  });
  fs.writeFileSync(`qa/${task}.log`, r.stdout + (r.stderr || ""));
  results.push({
    task,
    exit_code: r.status,
    passed: r.status === 0,
    elapsed_ms: Date.now() - started,
  });
  console.log(task, r.status === 0 ? "PASS" : "FAIL");
  if (r.status !== 0) console.log((r.stdout + r.stderr).slice(-4000));
}
fs.writeFileSync(
  "qa/final-checks.json",
  JSON.stringify(
    {
      checked_at: new Date().toISOString(),
      scope: "Frontend only; no Rust rebuild and no chain writes",
      results,
    },
    null,
    2,
  ),
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
