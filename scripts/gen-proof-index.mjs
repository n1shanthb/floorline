import fs from "node:fs";
const m = JSON.parse(fs.readFileSync("docs/evidence/proofs.json", "utf8"));
const lines = [];
lines.push("# Floorline Proof Index");
lines.push("");
lines.push(
  "Machine-readable source: [docs/evidence/proofs.json](./evidence/proofs.json) (also served at `/evidence/proofs.json`).",
);
lines.push("");
lines.push(
  `**Network:** NEAR TESTNET · **Contract:** \`${m.contract}\` · **Code hash:** \`${m.expected_code_hash}\``,
);
lines.push("");
lines.push(
  `**Acceptance:** ${m.verified_rows}/${m.total_rows} · \`${m.acceptance_status}\``,
);
lines.push("");
lines.push("## Classification legend");
lines.push("");
lines.push("| Label | Meaning |");
lines.push("| --- | --- |");
lines.push(
  "| SUCCESSFUL_FINALIZED_TESTNET_RECEIPT | Root + descendants closed FINAL with success statuses |",
);
lines.push(
  "| ARCHIVED_HISTORICAL | Older demo evidence (e.g. v1 UI pack) — not RC1 row |",
);
lines.push(
  "| LOCAL_SANDBOX / FAULT_INJECTION / OFFLINE_SIMULATION | Not public-testnet acceptance |",
);
lines.push("");
lines.push("## Final recorded state");
lines.push("");
lines.push("```json");
lines.push(JSON.stringify(m.final_state, null, 2));
lines.push("```");
lines.push("");
lines.push("## Gas amendments (evidence-only)");
lines.push("");
for (const g of m.gas_amendments || []) {
  lines.push(
    `- \`${g.step_id}\`: planned ${g.planned_gas} → finalized ${g.finalized_gas}${g.hash ? " · " + g.hash : ""}`,
  );
}
lines.push("");
lines.push("## RC1 catalog (40)");
lines.push("");
lines.push("| # | ID | Method | Hash | Group | Receipts |");
lines.push("| --- | --- | --- | --- | --- | --- |");
m.proofs.forEach((p, i) => {
  lines.push(
    `| ${i + 1} | ${p.step_id} | ${p.method || ""} | [${p.transaction_hash.slice(0, 8)}…](${p.explorer_url}) | ${p.group} | ${p.receipt_proof?.count ?? ""} |`,
  );
});
lines.push("");
lines.push("## Related submission — NEAR Intent One (NOT Floorline)");
lines.push("");
lines.push(m.related_submission_nio.note);
lines.push("");
lines.push(`- Repo: ${m.related_submission_nio.repo}`);
lines.push(`- Demo: ${m.related_submission_nio.demo}`);
lines.push(`- Verify: ${m.related_submission_nio.verify}`);
lines.push(`- Proof index: ${m.related_submission_nio.proof_index}`);
lines.push("");
fs.writeFileSync("docs/PROOF_INDEX.md", lines.join("\n"));
console.log("wrote PROOF_INDEX.md", m.proofs.length);
