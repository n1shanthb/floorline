#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  "README.md",
  "docs/PROOF_INDEX.md",
  "docs/judges/CLAUDE_CODE_PROMPT.md",
  "docs/judges/CODEX_PROMPT.md",
  "docs/judges/JUDGE_RUNBOOK.md",
  "docs/submission/SUBMISSION.md",
  "docs/submission/DEMO_SCRIPT.md",
  "docs/submission/RULES_CHECKLIST.md",
  "frontend/public/evidence/proofs.json",
];

const urlRe = /https?:\/\/[^\s)`"'<>]+/g;
const mdLinkRe = /\[[^\]]*\]\(([^)]+)\)/g;
const seen = new Map();
const report = { ok: [], fail: [], transient: [], local_missing: [] };

function collectFrom(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    report.local_missing.push(file);
    return;
  }
  const text = fs.readFileSync(abs, "utf8");
  const urls = new Set();
  for (const m of text.matchAll(urlRe)) urls.add(m[0].replace(/[.,;]+$/, ""));
  for (const m of text.matchAll(mdLinkRe)) {
    const href = m[1];
    if (href.startsWith("http")) urls.add(href.split(/\s+/)[0]);
    else if (!href.startsWith("#") && !href.startsWith("mailto:")) {
      const local = path.normalize(path.join(path.dirname(abs), href.split("#")[0]));
      if (!fs.existsSync(local)) report.local_missing.push(`${file} -> ${href}`);
    }
  }
  for (const u of urls) {
    if (!seen.has(u)) seen.set(u, file);
  }
}

for (const t of targets) collectFrom(t);

// Also validate every explorer URL in proofs.json
const proofsPath = path.join(root, "frontend/public/evidence/proofs.json");
if (fs.existsSync(proofsPath)) {
  const m = JSON.parse(fs.readFileSync(proofsPath, "utf8"));
  for (const p of m.proofs || []) if (p.explorer_url) seen.set(p.explorer_url, "proofs.json");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let i = 0;
for (const [url, from] of seen) {
  i++;
  process.stdout.write(`(${i}/${seen.size}) ${url.slice(0, 80)}… `);
  try {
    await sleep(200);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: { "user-agent": "floorline-link-check/1.0" },
    });
    if (res.status === 429 || res.status === 408) {
      report.transient.push({ url, from, status: res.status });
      console.log("TRANSIENT", res.status);
    } else if (res.ok || res.status === 401 || res.status === 403) {
      // 401/403 often mean the resource exists but blocks bots
      report.ok.push({ url, from, status: res.status });
      console.log(res.status);
    } else {
      report.fail.push({ url, from, status: res.status });
      console.log("FAIL", res.status);
    }
  } catch (e) {
    report.transient.push({ url, from, error: e.message });
    console.log("TRANSIENT", e.message);
  }
}

fs.mkdirSync(path.join(root, "docs/submission"), { recursive: true });
fs.writeFileSync(
  path.join(root, "docs/submission/LINK_CHECK.json"),
  JSON.stringify(report, null, 2),
);
console.log(
  `\nOK ${report.ok.length} · FAIL ${report.fail.length} · TRANSIENT ${report.transient.length} · LOCAL_MISSING ${report.local_missing.length}`,
);
if (report.fail.length || report.local_missing.length) process.exitCode = 1;
