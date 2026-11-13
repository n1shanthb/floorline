// Generate only observed stopped-run evidence. No signing or broadcasts.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p));
const j=read('TESTNET_ACCEPTANCE_TRANSACTIONS.json'),b=read('TESTNET_ACCEPTANCE_BUDGET.json'),r=read('acceptance-execution/RECONCILIATION.json'),qa=read('acceptance-execution/BROWSER_QA.json');
const last=j.transactions.at(-1),loan=j.final.loans['15'];
const near=x=>{x=BigInt(x);return `${x/10n**24n}.${(x%10n**24n).toString().padStart(24,'0')}`;};
const hashes=j.transactions.map(t=>`- ${t.status}: ${t.name}: [${t.hash}](https://testnet.nearblocks.io/txns/${t.hash})`).join('\n');
const expiry=new Date(Number(BigInt(loan.expiry)/1000000n)).toISOString();
const cases=`- A: BLOCKED browser wallet connection/signing; CLI identity/access and eight actual final receipt chains verified. No authenticated browser session available. CLI is not browser acceptance.
- B: SKIPPED unnecessary storage registration/top-ups; all financial actors already registered with sufficient credit. No registration write submitted.
- C: PASS READ-ONLY issuance gate: L>T; no positive 1:1 issuance attempt, treasury reset or workaround.
- D: PASS CLI Alice→Dave 0.01 FLOOR transfer; exact balances and unchanged L/T.
- E: PASS CLI Alice redemption, 0.05 FLOOR burned. Quote ${j.redemption_quote.quote} yoctoNEAR; 50-bps minimum ${j.redemption_quote.min_out}. Claim 10 paid through actual native transfer and successful callback.
- F: PASS CLI Bob funds 0.02 NEAR offer #12, cancels and withdraws claim #13; actual native return verified.
- G: BLOCKED (funding/acceptance substeps PASS): Bob funded loan #15, 0.05 principal/0.055 debt/0.10 FLOOR collateral/24-hour term. Carol accepted and owns NFT #15 and borrower claim #16. Principal withdrawal broadcast unresolved. NFT transfer to Dave, repayment and Bob's lender withdrawal NOT submitted.
- H: BLOCKED by stop-on-unknown: new 120-second default workflow NOT submitted.
- I: BLOCKED by stop-on-unknown: new direct 0.01 NEAR contribution NOT submitted.
- J: BLOCKED by stop-on-unknown: NO new Sputnik proposal, votes or contribution. Existing historical proposal #0 is not substituted for new acceptance. Council remains operator-controlled simulated council.
- K: BLOCKED/SKIPPED: unused storage withdrawal must occur last; NOT submitted.

Known-invalid old-owner/double/expired writes were SKIPPED. No deposits were spent on known-invalid calls. Prior historical/mock negative evidence is separate from this run.`;
const recovery=`Resolve the SAME hash ${last.hash} read-only through healthy RPCs and inspect every child receipt. Check claim #16, Carol's nonce/native balance, NFT #15 owner and finalized expiry. Do not clear the journal, re-sign or resubmit merely because a node returns UNKNOWN_TRANSACTION. Require a definitive outcome/nonexecution assessment before deciding another action. If final success is found, verify Paid and exact native debit. If failure is found, distinguish rollback from failed native transfer or unresolved callback. Do not replay the whole plan.`;
fs.writeFileSync('TESTNET_ACCEPTANCE_RESULTS.md',`# Authorized testnet acceptance — stopped safely

Checked ${new Date().toISOString()}.

**TESTNET NOT READY. MAINNET NOT READY. FloorKit BLOCKED.**

Nine signed broadcast attempts: **8 actual on-chain final successes, 0 confirmed failures, 1 unresolved/unlocated attempt**. The ninth is NOT a confirmed on-chain transaction. Its broadcast response was JSON-RPC -429; two independent RPCs returned UNKNOWN_TRANSACTION. These are not execution receipts and do not prove the signed transaction can never execute. No re-sign/rebroadcast occurred. All financial execution stopped.

## Planned cases

${cases}

## Actual hashes

${hashes}

Raw receipts, callbacks, exact intentions, gas/deposits, balances and before/after finalized accounting for the eight successes are in TESTNET_ACCEPTANCE_TRANSACTIONS.json. The unresolved attempt has a broadcast error, read-only recovery evidence and stop snapshot, not a fabricated receipt.

## Outstanding rights and recovery

Carol currently owns NFT #15; **0.10 FLOOR remains locked**. Borrower claim #16 is Available for **0.05 NEAR** at finalized block ${j.final.block.height}; inflight is zero, and no principal debit is observed in that snapshot. The signer nonce is also unchanged from the pre-broadcast view. These observations do not authorize retrying an uncertain payout. Loan expiry **${expiry}**, exact ${loan.expiry} ns. Bob remains the immutable lender; default transfers collateral under the existing rules. No automated repayment/default/follow-up was scheduled.

${recovery}

## Exact accounting and costs

Initial L=${near(j.preflight.ledger.L)}, T=${near(j.preflight.ledger.T)}, backing ratio ${r.initial_backing.ratio}. Current STOP snapshot L=${near(j.final.ledger.L)}, T=${near(j.final.ledger.T)}, ratio ${r.final_backing.ratio} NEAR/FLOOR. Exact integer numerator/denominator amounts are authoritative. This is liquid treasury backing, not a market-price or untaxed redemption guarantee.

All eight completed operations passed reserve partition, native solvency, storage coverage, known-holder/locked supply partition and nondecreasing positive-supply backing checks. Stop native balance ${near(j.final.account.amount)}, required ${near(j.final.ledger.local_required)}, surplus ${near(r.final_native_surplus_yocto)} NEAR. Borrower claims 0.05 NEAR and locked collateral 0.10 FLOOR remain accounted for. Inflight/refund storage/pending NFT callbacks are zero at stop.

Observed gross authorization cost **${b.gross_consumed_NEAR} NEAR**: attachments ${near(b.gross_attached_yocto)}, actual final receipt fees ${near(b.actual_gas_fee_yocto)}. Observed project-wide net expenditure, including FLOOR/DAO balances, **${b.project_native_conservation.net_expenditure_NEAR} NEAR**, exactly known fees; capital remains project balances. Unresolved attempt gas is unknown; reserve ${near(b.unresolved_gas_reservation_yocto)} NEAR conservatively. Observed remaining ${b.remaining_gross_budget_NEAR} NEAR; after unresolved reservation ${near(b.remaining_after_unresolved_reservation_yocto)} NEAR. Refunds never reset gross authorization. No new DAO spend: historical conservative gross+contribution+fees remains 8.130618890941592 NEAR under 10. Detailed per-account deltas, payouts and upfront reserves: TESTNET_ACCEPTANCE_BUDGET.json.

## Verification and integrity

Typecheck, lint, all 60 unit tests and production build PASS. Read-only production browser QA: ${qa.result}; see TESTNET_ACCEPTANCE_BROWSER_QA.md. Authenticated signing, wallet rejection/redirect recovery and intermediate role-specific receipt refresh remain unverified. No CLI hashes were injected into browser history.

${r.protected_file_count} protected pre-existing tracked files match SHA-256. Approved FLOOR normal WASM and three FloorKit artifacts unchanged. No contract/DAO redeploy, policy change, new accounts/keys, key deletion, mainnet action, FloorKit modification or historical-evidence alteration. The authorized SDK consumed existing local testnet signing facilities; private keys were not manually inspected, exported or logged.

The exact prior acceptance result is archived in acceptance-execution/PREVIOUS_ACCEPTANCE_RESULTS.md. Earlier read-only reports remain historical; the authoritative current state for this run is TESTNET_ACCEPTANCE_TRANSACTIONS.json.final, explicitly a STOP snapshot, not completed acceptance.
`);
fs.writeFileSync('TESTNET_ACCEPTANCE_BROWSER_QA.md',`# Browser acceptance

**Authenticated browser wallet acceptance BLOCKED.** No browser tabs/authenticated session were available. In-app browser local-preview navigation timed out. No keys were imported/created and no security control bypassed.

Local automated production-browser QA uses real RPC and clean unauthenticated contexts: desktop 1440×1000, mobile 390×844. Result **${qa.result}**. It does not establish wallet signing.

${qa.pages.map(p=>`- ${p.mode} ${p.route}: ${p.heading}; overflow=${p.overflow}; ${p.screenshot}`).join('\n')}

Exact observations/errors: acceptance-execution/BROWSER_QA.json. ${qa.failure??''}

Treasury reads are compared with the current stop snapshot. Proposal #0 remains historical; no new proposal exists. CLI transactions remain absent from the clean browser journal; no hash/account/intent injection was used. Signing, rejection, redirect recovery, pending-to-final wallet UI, role balances/NFT/claims and per-operation desktop/mobile receipt refresh are BLOCKED/UNVERIFIED. Aggregate read-only refresh cannot substitute for them. Physical mobile and public HTTPS deployment are also unverified.

Existing mock browser tests/historical screenshots are unchanged and are not new live financial acceptance. Current typecheck/lint/60 tests/build passed; logs in acceptance-execution/.
`);
fs.writeFileSync('TESTNET_ACCEPTANCE_FINAL_GATE.md',`# Final acceptance gate

**TESTNET NOT READY.**

- Eight actual contract transactions: final success, all child receipts and exact accounting verified.
- Ninth broadcast attempt UNRESOLVED: ${last.hash}; RPC -429 then UNKNOWN_TRANSACTION on independent nodes. No final receipt or automatic retry.
- Remaining signed legs BLOCKED. No fabricated substitute transactions.
- CLI signing/access VERIFIED for completed operations; browser signing/recovery BLOCKED.
- Read-only production browser QA: ${qa.result}; full end-to-end acceptance INCOMPLETE.
- Operator-controlled simulated council only; no new governance execution or independent-human-governance claim.
- Current stop snapshot solvent, with borrower claim 0.05 NEAR and 0.10 FLOOR locked. Loan #15 expiry ${expiry}.
- Observed gross ${b.gross_consumed_NEAR}/2.10 NEAR; unresolved fee reservation retained. Cumulative DAO ceiling unchanged/satisfied.
- Approved contracts, DAO policy, historical evidence and FloorKit unchanged.

**MAINNET NOT READY.** MAINNET_READINESS.md remains applicable: independent exact-artifact security review, full-access-key/upgrade policy, callback-loss/recovery assessment, exposure controls, monitoring and release gates incomplete. No mainnet action.

**FloorKit BLOCKED.** Callback-loss availability remains unresolved. No changes or frontend integration.

Next: ${recovery}

Then obtain an authenticated project testnet wallet and healthy RPC; prepare a state-aware bounded continuation and verify browser-to-wallet-to-chain-to-browser behavior. Earlier RELEASE_BLOCKERS.md describes the prior unsigned review: this run supersedes only its historical no-new-transactions statement, not its unresolved browser/mainnet gates.
`);
for(const [p,h] of Object.entries(read('acceptance-execution/ARTIFACT_BASELINE.json')))if(createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==h)throw Error(`artifact changed ${p}`);
console.log('Wrote stopped-run reports; approved artifacts unchanged');
