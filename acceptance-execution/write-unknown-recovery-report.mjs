// Offline report generation only; preserves all pre-existing acceptance evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const s=JSON.parse(fs.readFileSync('acceptance-execution/UNKNOWN_TX_STATE_RECONCILIATION.json')),e=JSON.parse(fs.readFileSync('acceptance-execution/UNKNOWN_TX_RPC_EVIDENCE.json'));
assert.equal(s.assessment.classification,'STILL_UNKNOWN');
assert(!e.queries.some(q=>q.params?.tx_hash===e.hash&&q.response?.result?.final_execution_status==='FINAL'));
const a=s.assessment,l=s.local_evidence,stamp=new Date().toISOString();
const near=n=>{n=BigInt(n);return `${n/10n**24n}.${(n%10n**24n).toString().padStart(24,'0')}`;};
const time=new Date(Number(BigInt(s.block.timestamp_nanosec)/1000000n)).toISOString();
const result=q=>q.response?.error?`${q.response.error.code}: ${q.response.error.cause?.name??q.response.error.message}`:q.transport_error?`${q.transport_error.name}: ${q.transport_error.message}`:q.response?.result?.final_execution_status??'No execution status';
const providers=e.providers.map(p=>`- ${p.name}, ${p.endpoint}, verified chain ${p.chain_id}. ${e.queries.filter(q=>q.endpoint===p.endpoint&&q.params?.tx_hash===e.hash).map(q=>`${q.method}/${q.params.wait_until}: HTTP ${q.http_status??'unavailable'}, ${result(q)}`).join('; ')}.`).join('\n');
const seconds=BigInt(a.remaining_before_expiry_ns)/1000000000n,remaining=`${seconds/3600n}h ${(seconds%3600n)/60n}m ${seconds%60n}s plus fractional seconds`;
const next=`1. Keep the existing hash and claim quarantined. Query that same hash read-only through public/archival providers; preserve any actual outcome and all child receipts. Do not erase the journal or infer nonexecution from an indexer omission.
2. A definitive final receipt must be reconciled with claim attempt/state, exact native payout, nonce and callbacks. Alternatively establish future invalidity plus sufficiently complete finalized history/state; expiry alone is insufficient. Current reference validity and nonce do NOT invalidate the old transaction.
3. Only after resolution, and under a separately authorized state-aware continuation, consider a fresh claim #16 withdrawal if it is still Available and the old transaction cannot cause a later payout. Verify receipt/claim Paid before proceeding. No fresh withdrawal is safe to declare now.
4. If loan #15 is still Active before actual finalized expiry, review Carol→Dave NFT transfer (one yocto), verify Dave ownership, Dave exact 0.055 NEAR repayment, NFT burn/0.10 FLOOR release, and Bob's separate lender claim withdrawal. The 0.05 principal claim is not the 0.055 repayment. If expiry has passed, repay rejects; existing permissionless default_loan on an Active, nonpending loan transfers collateral to Bob and burns NFT, but no settlement is authorized here. Do not force the original repayment script through expiry.
5. Then reassess budget/state before the distinct 0.02/0.022 NEAR, 0.05 FLOOR, 120-second default case; direct 0.01 NEAR contribution; one actual 0.10 NEAR Sputnik proposal and B/C votes using the live bond/actual ID; and safe unused storage withdrawal last. Do not repeat the already successful transfer, redemption, cancellation, funding or acceptance.
6. Obtain authenticated testnet wallet access and verify actual browser→wallet→chain→browser recovery and role-specific mobile/desktop updates. CLI receipts and historical replay do not complete frontend acceptance. Council remains operator-controlled simulated council, not independently controlled humans.`;
fs.writeFileSync('acceptance-execution/UNKNOWN_TX_RECOVERY.md',`# Phase 2A — unresolved withdrawal investigation

New dated recovery record: ${stamp}. This does not overwrite or retroactively green the earlier acceptance results. **Strictly read-only: zero signatures, broadcasts, retries, financial transactions, deployments or key operations.**

**Primary classification: STILL_UNKNOWN. Fresh withdrawal safe to consider: UNPROVEN.**

Target [${e.hash}](https://testnet.nearblocks.io/txns/${e.hash}); signer ${e.signer}; receiver ${l.receiver}; withdraw_claim({claim_id:"16"}), zero attached NEAR, ${l.gas} gas (110 Tgas). Original -429 response is retained verbatim in RPC evidence. Explorer N/A is not proof.

## Local forensic evidence

The raw original signed transaction and signature were not retained in the inspected acceptance journal/directory. No signature was recreated and no credential directory was opened. The original runner source derives the transaction hash from the Borsh-encoded unsigned transaction before signing. Offline reconstruction of the 233-byte unsigned transaction using only retained public inputs **exactly matches the original hash**. The unsigned bytes are retained explicitly as unsigned/public in JSON, not presented as a signed payload.

- Public key: ${l.public_key}.
- Exact original nonce verified by the hash match: ${l.nonce}; this is the last confirmed same-key nonce plus one.
- Reference block ${l.reference_block_hash}, height ${l.reference_block_height}, timestamp ${l.reference_timestamp_ns} ns. RPC confirms it is canonical.
- Method/argument bytes, receiver, zero deposit and 110 Tgas are bound by that hash match.
- Exact original broadcast time was not saved; reference block time is not substituted for it. The signature and signed wire bytes cannot be independently verified from the surviving local record. Hash matching does not establish RPC acceptance/inclusion.

## Actual provider observations

${providers}

Both advertised archival providers also returned an independently checked **FINAL success** with successful child outcomes for historical control hash 6TfeGDTc5YyPPXtKb1QbBd2XFsUHB2Wsx3eaTFaX8cHy. Those controls prove working historical retrieval for that known transaction, not a target withdrawal receipt. No provider returned an actual target transaction, receipt ID, outcome, native-transfer receipt or claim_result callback. Therefore no callback/fee success was inferred. All exact methods, parameters, query/completion timestamps, raw JSON errors, HTTP codes, status/version/network and full control receipts are in UNKNOWN_TX_RPC_EVIDENCE.json. Transport aborts have no raw server JSON and are labeled accordingly. dRPC's free-plan timeout/method restriction is preserved.

The [official RPC guide](https://docs.near.org/api/rpc/transactions) distinguishes status-with-receipts methods and FINAL from earlier milestones. It also explains UNKNOWN_TRANSACTION at NONE versus timeout when waiting for FINAL. The [provider directory](https://docs.near.org/api/rpc/providers) identifies the public and archival endpoints. No alternative endpoint was used for broadcasting.

## Common finalized recovery state

Primary provider ${s.endpoint}; finalized block **${s.block.height} / ${s.block.hash}**, network time **${time}**, exact ${s.block.timestamp_nanosec} ns. Principal account/contract/loan/claim/key/balance/policy reads were pinned to this same hash. An independent provider confirmed claim #16 and the exact public-key nonce at the same hash. Status calls and reference-block/config queries have their own timestamps; this is a snapshot, not a claim of continuous monitoring.

- Claim #16: **Available**, ABI state 0, attempt 0, owner Carol (${s.claim16.owner}), amount 50000000000000000000000 yoctoNEAR (0.05), kind 0 borrower principal. This ABI maps 1=InFlight, 2=known native-transfer failure, 3=Paid; no invented Failed/Unknown view was queried. No failure/restoration path was invoked.
- Inflight ${s.ledger.inflight}; borrower claim bucket ${s.ledger.borrower_claims}; refund storage ${s.ledger.refund_storage}; pending NFT callback count ${s.loan15.pending}. Available/attempt-zero state is consistent with no observed successful withdrawal initiation, not proof of permanent nonexecution.
- FLOOR native ${near(s.account.amount)} NEAR; local_required ${near(s.ledger.local_required)}; surplus ${near(a.local_surplus_yocto)}. Exact reserve partition, native solvency, storage coverage and free+locked FLOOR supply partition pass. L=${near(s.ledger.L)}, T=${near(s.ledger.T)}; locked 0.10 FLOOR counted once.
- Carol native ${near(s.carol_native.amount)} NEAR. Both Carol and FLOOR balances differ by zero from the unresolved transaction's original pinned preflight. No principal debit or payout is observed at this snapshot. No finalized target receipt means actual target fee remains null, not asserted zero.
- NFT #15 owner ${s.nft15.owner_id}; loan state **Active**, lender Bob (${s.loan15.lender}), debt 0.055 NEAR, principal 0.05 NEAR, collateral 0.10 FLOOR, no pending NFT transfer.

## Future-inclusion and expiry assessment

The hash-bound original nonce is **${l.nonce}**; the exact same public key's finalized nonce is **${a.finalized_nonce}**. It has not advanced enough to invalidate this original transaction. Nonce comparison by itself would not prove this hash succeeded if it advanced.

Live protocol config reports transaction_validity_period=${a.transaction_validity_period_blocks} blocks. The reference block is only ${a.reference_block_age_heights} heights old. It is **not expired**; the height-based threshold is ${l.reference_block_height+a.transaction_validity_period_blocks}, with expiry only beyond the configured window. Do not convert this height window into a guaranteed wall-clock deadline. The [NEAR routing specification](https://nomicon.io/architecture/how/tx_routing.html) describes reference-block-based inclusion validity. Even a future expired reference would only exclude later inclusion, not automatically disprove earlier inclusion/asynchronous work.

Loan expiry is independent: exact ${s.loan15.expiry} ns, **2026-11-14T04:04:11.656Z / November 14, 09:34:11.656 IST** (ISO milliseconds truncate remaining nanoseconds). At the finalized recovery time it is before expiry by ${a.remaining_before_expiry_ns} ns (${remaining}). The NFT transfer/current-owner repayment sequence remains contractually feasible before expiry, subject to resolution and fresh ownership/time checks; it was NOT executed. Repay requires now<expiry; default_loan permits now>=expiry on an active loan with pending=0 and gives collateral to the immutable lender. No automatic settlement or monitoring was scheduled.

## Budget and integrity

Recomputed from eight actual confirmed receipt chains: gross attachments 0.070000000000000000000001 NEAR; actual fees ${near(s.budget.confirmed_gas_fee_yocto)}; observed gross ${near(s.budget.observed_gross_yocto)}. Unknown fee remains **null**. Keep the full **0.142 NEAR reservation**; budget adjustment zero. Remaining after reservation ${near(s.budget.remaining_after_reservation_yocto)} NEAR. Refunded capital does not reset gross usage. Historical conservative DAO cost stays 8.130618890941592/10 NEAR; new DAO spend zero. No previous budget/evidence file was edited.

All ${s.integrity.tracked_files_checked} original tracked files match their pre-investigation SHA-256, including historical acceptance/Gate3 evidence, Rust source, FloorKit and frontend. Approved FLOOR WASM SHA-256 529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6 and all three FloorKit artifacts unchanged. Deployed FLOOR and DAO hashes match expected values; full DAO policy unchanged. Relevant public access-key listings are in the pinned snapshot. This phase performed no key changes, signing, mainnet operations or redeployment; it does not claim exhaustive historical key-operation indexing.

## Remaining evidence and acceptance steps

Missing decisive evidence: an actual finalized target execution/receipt chain; or sufficient finalized-history reconciliation plus proof of future invalidity. Neither is available now. Raw original signature and exact send timestamp are also absent. No complete claim-event/history index was invented. Claim #16 stays quarantined.

${next}

RECOVERY GATE: BLOCKED
TESTNET ACCEPTANCE: NOT READY
MAINNET: NOT READY
FLOORKIT: BLOCKED
`);
fs.writeFileSync('acceptance-execution/UNKNOWN_TX_RECOVERY_GATE.md',`# Phase 2A recovery gate

${stamp}; new authoritative recovery record, earlier acceptance evidence preserved.

**STILL_UNKNOWN — fresh withdrawal safety UNPROVEN.**

Hash ${e.hash}. Five verified-testnet endpoints across NEAR, FastNear and dRPC, including two functioning archival endpoints, returned no target final receipt. UNKNOWN_TRANSACTION, timeouts, free-plan restrictions and explorer N/A are not nonexecution proof. Historical positive controls succeeded on both archives.

Unsigned public-payload SHA-256/Borsh hash exactly matches. Original nonce ${l.nonce}, current nonce ${a.finalized_nonce}. Reference age ${a.reference_block_age_heights}/${a.transaction_validity_period_blocks} heights: **not expired**. No definitive future-inclusion barrier exists from these checks. Original signature/raw signed wire bytes unavailable; no signature recreated.

At finalized ${s.block.height} (${s.block.hash}), ${time}: claim #16 Available/attempt 0/0.05 NEAR, inflight 0; NFT #15 owned by Carol, Active loan, 0.10 FLOOR locked, debt 0.055 NEAR. Native balances unchanged from unresolved preflight, buckets solvent. Independent same-block claim/nonce reads match. Loan expiry November 14 at 09:34:11.656 IST, still before expiry in this snapshot.

Zero transactions/signatures/key operations in this phase. Reservation 0.142 NEAR retained; unknown fee null; no budget adjustment. ${s.integrity.tracked_files_checked} original tracked files, approved WASM, FloorKit artifacts and full DAO policy unchanged.

${next}

Created: UNKNOWN_TX_RECOVERY.md, UNKNOWN_TX_RPC_EVIDENCE.json, UNKNOWN_TX_STATE_RECONCILIATION.json and this gate. Supporting read-only scripts are new; no previous evidence or product file changed.

RECOVERY GATE: BLOCKED
TESTNET ACCEPTANCE: NOT READY
MAINNET: NOT READY
FLOORKIT: BLOCKED
`);
console.log('Created both recovery reports; classification STILL_UNKNOWN, original evidence preserved');
