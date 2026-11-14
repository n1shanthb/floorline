#!/usr/bin/env node
/**
 * Floorline judge verification — secret-free, no wallet, no change methods.
 * Modes:
 *   npm run judge:verify           # offline required + live optional
 *   npm run judge:verify -- --offline
 *   npm run judge:verify -- --live
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");
const args = new Set(process.argv.slice(2));
const offlineOnly = args.has("--offline");
const liveOnly = args.has("--live");
const spacingMs = 8100;

const results = [];
const record = (name, status, detail = "") => {
  results.push({ name, status, detail });
  const mark =
    status === "PASS" ? "✓" : status === "FAIL" ? "✗" : status === "SKIPPED" ? "·" : "?";
  console.log(`${mark} [${status}] ${name}${detail ? " — " + detail : ""}`);
};

const run = (cmd, cmdArgs, opts = {}) => {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...opts,
  });
  return r;
};

function assertNoSecrets(text, label) {
  // Avoid self-matching this scanner's source by skipping when scanning this file's pattern table.
  const suspicious =
    (text.includes("PRIVATE KEY") && /BEGIN [A-Z0-9 ]*PRIVATE KEY/.test(text)) ||
    /BEGIN (RSA |OPENSSH )?PRIVATE KEY/.test(text) ||
    /\brecovery phrase\b/i.test(text) ||
    (/\bmnemonic\b/i.test(text) && /\b(seed|wallet|phrase)\b/i.test(text));
  // Full-access NEAR secret keys are long base58 after ed25519:; public keys are shorter.
  const ed = text.match(/ed25519:([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)/gi) || [];
  const longSecrets = ed.filter((m) => m.split(":")[1].length >= 80);
  if (suspicious || longSecrets.length) {
    throw new Error(`Possible secret material in ${label}`);
  }
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

let gate = Promise.resolve();
async function throttledFetch(url, body) {
  const wait = gate.then(() => sleep(spacingMs));
  gate = wait;
  await wait;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "judge-verify", method: body.method, params: body.params }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

console.log("Floorline judge:verify");
console.log("cwd", root);

// 1. Diagnostics
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  if (!pkg.scripts?.["judge:verify"]) throw new Error("missing judge:verify script");
  record("runtime_diagnostics", "PASS", `node ${process.version}; package ${pkg.name}`);
} catch (e) {
  record("runtime_diagnostics", "FAIL", e.message);
}

// 2. Evidence manifest
let manifest;
try {
  const p = path.join(root, "public/evidence/proofs.json");
  const raw = fs.readFileSync(p, "utf8");
  assertNoSecrets(raw, "proofs.json");
  manifest = JSON.parse(raw);
  if (manifest.verified_rows !== 40 || manifest.total_rows !== 40)
    throw new Error(`expected 40/40, got ${manifest.verified_rows}/${manifest.total_rows}`);
  if (manifest.contract !== "rc1.floorline-g3-20261111-6702ea.testnet")
    throw new Error("unexpected contract");
  if (manifest.expected_code_hash !== "4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az")
    throw new Error("unexpected code hash");
  if (!manifest.final_state?.pilot?.stopped) throw new Error("recorded stopped!=true");
  const hashes = new Set(manifest.proofs.map((x) => x.transaction_hash));
  if (hashes.size !== 40) throw new Error("duplicate or missing hashes");
  for (const proof of manifest.proofs) {
    if (!proof.transaction_hash || !proof.explorer_url?.includes(proof.transaction_hash))
      throw new Error(`bad explorer link for ${proof.id}`);
    if (proof.network !== "testnet") throw new Error(`${proof.id} not testnet`);
    if (proof.classification !== "SUCCESSFUL_FINALIZED_TESTNET_RECEIPT")
      throw new Error(`${proof.id} bad classification`);
  }
  record("evidence_manifest", "PASS", "40 unique testnet proofs; stopped=true");
} catch (e) {
  record("evidence_manifest", "FAIL", e.message);
}

// 3. Config / source consistency
try {
  const cfg = fs.readFileSync(path.join(root, "src/lib/config.ts"), "utf8");
  assertNoSecrets(cfg, "config.ts");
  if (!cfg.includes("rc1.floorline-g3-20261111-6702ea.testnet"))
    throw new Error("frontend config missing RC1 contract");
  if (!cfg.includes("4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az"))
    throw new Error("frontend config missing RC1 code hash");
  if (/mainnet(?!.*NOT)/i.test(cfg) && cfg.includes('NETWORK = "mainnet"'))
    throw new Error("frontend claims mainnet network");
  record("source_config_consistency", "PASS");
} catch (e) {
  record("source_config_consistency", "FAIL", e.message);
}

// 4. Secret scan of public evidence + key frontend files
try {
  const scanPaths = [
    "public/evidence/proofs.json",
    "src/lib/config.ts",
    "scripts/judge-verify.mjs",
  ];
  for (const rel of scanPaths) {
    assertNoSecrets(fs.readFileSync(path.join(root, rel), "utf8"), rel);
  }
  // Reject absolute Windows credential paths in published judge script
  const judgeSrc = fs.readFileSync(path.join(root, "scripts/judge-verify.mjs"), "utf8");
  if (/E:\\\\near-2\\\\.testnet-credentials/.test(judgeSrc))
    throw new Error("judge script references local credential path");
  record("secret_scan", "PASS");
} catch (e) {
  record("secret_scan", "FAIL", e.message);
}

if (!liveOnly) {
  // 5. Typecheck
  {
    const r = run("npm", ["run", "typecheck"]);
    record(
      "frontend_typecheck",
      r.status === 0 ? "PASS" : "FAIL",
      r.status === 0 ? "" : (r.stderr || r.stdout || "").slice(-400),
    );
  }
  // 6. Unit tests
  {
    const r = run("npm", ["test"]);
    record(
      "frontend_unit_tests",
      r.status === 0 ? "PASS" : "FAIL",
      r.status === 0 ? "vitest run" : (r.stderr || r.stdout || "").slice(-400),
    );
  }
  // 7. Build
  {
    const r = run("npm", ["run", "build"]);
    try {
      if (r.status !== 0) throw new Error((r.stderr || r.stdout || "").slice(-400));
      const dist = path.join(root, "dist");
      const index = fs.readFileSync(path.join(dist, "index.html"), "utf8");
      const proofs = path.join(dist, "evidence/proofs.json");
      if (!fs.existsSync(proofs)) throw new Error("dist missing evidence/proofs.json");
      record(
        "frontend_build",
        "PASS",
        `index ${createHash("sha256").update(index).digest("hex").slice(0, 12)}…`,
      );
    } catch (e) {
      record("frontend_build", "FAIL", e.message);
    }
  }
} else {
  record("frontend_typecheck", "SKIPPED", "--live mode");
  record("frontend_unit_tests", "SKIPPED", "--live mode");
  record("frontend_build", "SKIPPED", "--live mode");
}

// 8. Live read-only RPC
async function liveChecks() {
  if (offlineOnly) {
    record("live_rpc_code_hash", "SKIPPED", "--offline");
    record("live_rpc_pilot_state", "SKIPPED", "--offline");
    record("live_rpc_sample_receipts", "SKIPPED", "--offline");
    return;
  }
  const urls = ["https://rpc.testnet.near.org", "https://near-testnet.drpc.org"];
  try {
    const status = await throttledFetch(urls[0], { method: "status", params: [] });
    if (status.chain_id !== "testnet") throw new Error("chain_id!=testnet");
    const account = await throttledFetch(urls[0], {
      method: "query",
      params: {
        request_type: "view_account",
        account_id: manifest.contract,
        finality: "final",
      },
    });
    if (account.code_hash !== manifest.expected_code_hash)
      throw new Error(`live hash ${account.code_hash}`);
    record("live_rpc_code_hash", "PASS", account.code_hash);

    const pilotRaw = await throttledFetch(urls[0], {
      method: "query",
      params: {
        request_type: "call_function",
        account_id: manifest.contract,
        method_name: "pilot_status",
        args_base64: Buffer.from("{}").toString("base64"),
        finality: "final",
      },
    });
    const pilot = JSON.parse(Buffer.from(pilotRaw.result).toString());
    if (!pilot.stopped) throw new Error("live stopped!=true");
    if (pilot.guardian !== "floorline-g3-20261111-6702ea.testnet")
      throw new Error("unexpected guardian");
    record("live_rpc_pilot_state", "PASS", `stopped=${pilot.stopped}`);

    const sampleIds = ["stop", "unregister", "withdraw_storage", "contribute", "nft_transfer"];
    const samples = sampleIds.map((id) =>
      manifest.proofs.find((p) => p.step_id === id),
    );
    for (const s of samples) {
      if (!s) throw new Error("missing sample proof");
      const tx = await throttledFetch(urls[0], {
        method: "tx",
        params: {
          tx_hash: s.transaction_hash,
          sender_account_id: s.signer,
          wait_until: "FINAL",
        },
      });
      if (tx.final_execution_status !== "FINAL")
        throw new Error(`${s.step_id} not FINAL`);
      if (tx.status?.SuccessValue === undefined && !tx.status?.SuccessReceiptId)
        throw new Error(`${s.step_id} root not success`);
      for (const ro of tx.receipts_outcome || []) {
        const st = ro.outcome.status;
        if (st.SuccessValue === undefined && st.SuccessReceiptId === undefined)
          throw new Error(`${s.step_id} descendant failed ${ro.id}`);
      }
    }
    // Ordering: stop before unregister in journal index
    const stopIdx = manifest.proofs.findIndex((p) => p.step_id === "stop");
    const unIdx = manifest.proofs.findIndex((p) => p.step_id === "unregister");
    if (!(stopIdx >= 0 && unIdx > stopIdx))
      throw new Error("stop must precede unregister in catalog");
    record(
      "live_rpc_sample_receipts",
      "PASS",
      "5 sample txs FINAL with descendant success; stop→unregister order OK",
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const unavailable = /HTTP 408|HTTP 429|fetch failed|AbortError|timeout|ENOTFOUND|ECONN/i.test(
      msg,
    );
    record(
      "live_rpc_code_hash",
      unavailable ? "UNAVAILABLE" : "FAIL",
      msg,
    );
    record("live_rpc_pilot_state", unavailable ? "UNAVAILABLE" : "FAIL", msg);
    record("live_rpc_sample_receipts", unavailable ? "UNAVAILABLE" : "FAIL", msg);
  }
}

await liveChecks();

const required = results.filter((r) =>
  ["runtime_diagnostics", "evidence_manifest", "source_config_consistency", "secret_scan"].includes(
    r.name,
  ) ||
  (!liveOnly &&
    ["frontend_typecheck", "frontend_unit_tests", "frontend_build"].includes(r.name)),
);
const failedRequired = required.filter((r) => r.status === "FAIL");
const failedLive = results.filter(
  (r) => r.name.startsWith("live_") && r.status === "FAIL",
);

console.log("\n=== SUMMARY ===");
for (const r of results) console.log(`${r.status.padEnd(12)} ${r.name}`);
if (failedRequired.length) {
  console.log("\nRESULT: FAIL");
  process.exitCode = 1;
} else if (failedLive.length) {
  console.log("\nRESULT: FAIL (live checks)");
  process.exitCode = 1;
} else {
  const liveSkipped = results.some(
    (r) => r.name.startsWith("live_") && (r.status === "SKIPPED" || r.status === "UNAVAILABLE"),
  );
  console.log(
    liveSkipped
      ? "\nRESULT: PASS (offline suite); live UNAVAILABLE/SKIPPED"
      : "\nRESULT: PASS",
  );
  process.exitCode = 0;
}

// silence unused
void repoRoot;
