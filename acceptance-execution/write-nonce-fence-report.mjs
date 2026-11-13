// Offline design reports only. Does not sign or broadcast a candidate.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const p=JSON.parse(fs.readFileSync('acceptance-execution/NONCE_FENCE_PREFLIGHT.json')),s=p.state,a=p.assessment,c=p.candidate;
const comparison=JSON.parse(fs.readFileSync('acceptance-execution/nonce-fence-source/NONCE_RULE_COMPARISON.json'));
const commit='0ad2bdb2630e85bbacecab2a3b77072c78b46bc6',base=`https://github.com/near/nearcore/blob/${commit}/`;
const near=n=>{n=BigInt(n);return `${n/10n**24n}.${(n%10n**24n).toString().padStart(24,'0')}`;};
const utc=new Date(Number(BigInt(s.block.timestamp_nanosec)/1000000n)).toISOString();
const references=[['V0/nonce modes','core/primitives/src/transaction.rs#L214'],['nonce validity','runtime/runtime/src/verifier.rs#L255'],['nonce persistence','runtime/runtime/src/lib.rs#L2394'],['pool hash deduplication','chain/pool/src/lib.rs#L88'],['fee calculation','runtime/runtime/src/config.rs#L480'],['reference-block expiry','chain/chain/src/store/utils.rs#L56'],['protocol feature activations','core/primitives-core/src/version.rs#L614']].map(([label,p])=>`[${label}](${base}${p})`).join(', ');
const sourcesDir='acceptance-execution/nonce-fence-source';const provenance=fs.readdirSync(sourcesDir).filter(n=>n.endsWith('.rs')||n.endsWith('.md')||n.startsWith('licenses__')).map(n=>({file:n,commit:n.startsWith('sandbox-')?comparison.sandbox_commit:commit,sha256:createHash('sha256').update(fs.readFileSync(`${sourcesDir}/${n}`)).digest('hex')}));fs.writeFileSync(`${sourcesDir}/SOURCE_PROVENANCE.json`,JSON.stringify({reviewed_live_commit:commit,sandbox_commit:comparison.sandbox_commit,files:provenance,license_files:['licenses__LICENSE-MIT','licenses__LICENSE-APACHE']},null,2)+'\n');
const tree=`A. Original wins: require its actual finalized transaction identity/key/nonce, receipt graph, native transfer to Carol, claim_result callback, Paid claim, exact debit and fees. Do not submit a fresh withdrawal. Original nonce consumption can precede its payout; an InvalidNonce rejection of the fence is not evidence that the payout completed.
B. Fence wins: require a FINAL SUCCESS for the exact Carol→Carol single Transfer, original public key and exact nonce ${c.nonce}, one yocto, no additional actions; all receipts/refunds finalized, expected fee-only net debit and current key nonce >=n. Establish same account/key lifetime, no key deletion/recreation/nonce-reset path or unexplained other use. Verify claim #16 remains Available/attempt 0, borrower bucket 0.05, inflight 0, unchanged FLOOR native/accounting/loan/NFT. Independently verify final inclusion/receipts; a stale node returning UNKNOWN is not grounds to discard a verified final fence. Then original n cannot pass nonce validation and create a later payout receipt on that continuous key history. Only after full reconciliation may a fresh claim withdrawal be considered under separate authorization and fresh solvency/expiry review; it is not automatic.
C. Neither finalized: keep claim quarantined and reserve 0.142 NEAR. A submitted hash, forwarded transaction, pool acceptance, timeout or provider disagreement is not a fence. No rebroadcast/replacement/retry.
D. Unexpected nonce/key/account/code, contradictory balances, missing receipt/callback, changed policy, unrecognized action or unknown payout: STOP. Reconcile the actual winner and descendants; never choose the benign narrative merely because it is convenient.`;
fs.writeFileSync('acceptance-execution/NONCE_FENCE_FEASIBILITY.md',`# Phase 2B — nonce-fence feasibility

**NONCE FENCE: UNPROVEN. NO-GO for execution now.** The consensus mechanism supports a same-key/same-nonce exclusion argument, but the required signed runtime race has not run and this phase prohibits all signing/key creation. No public or sandbox transaction was signed/broadcast. No original evidence was changed. Separate sandbox-only signing authorization is reasonable as the next gate; public fence authorization should follow actual race proof, fresh preflight and explicit fee-exposure terms.

## Exact deployed rules

Fresh RPC reports protocol ${s.protocol.protocol_version}; live node version/commit is recorded in NONCE_FENCE_PREFLIGHT.json. Source inspected at nearcore **2.14.1 commit ${commit}**, not master. The installed sandbox reports 2.14.0 commit ${comparison.sandbox_commit}, protocol 88. Its verify_nonce function is byte-for-byte identical as text (${comparison.verify_nonce_identical}); this is source compatibility, not runtime proof. Full pinned files, licenses and SHA-256 provenance are under nonce-fence-source/.

Source references: ${references}.

1. Legacy V0 explicitly maps to Monotonic, requiring tx_nonce>effective_nonce; it does not require exactly +1. Effective nonce uses max(stored access-key nonce,pending.max_nonce); an upper bound requires nonce<height×1,000,000. Current ${c.nonce} is above stored ${a.nonce} and below the bound. V1 supports opt-in Strict (exact +1), enabled at protocol 85; it does not change V0 semantics. Gas-key nonce indexes/delegates/universal-account bootstrap are different paths; this ordinary FullAccess ed25519 V0 candidate uses none of them.
2. At most one transaction at n on a continuous ordinary account/key history can PASS verify-and-charge and produce its action receipt. Successful verification persists n before action-receipt execution; a later action failure does not make that nonce reusable. If a correctly finalized fence consumed n, an unaccepted original n is stale even if its bytes remain in another pool. If the original already consumed n, its asynchronous payout may remain pending while a fence is rejected.
3. Do not say two distinct transaction hashes can never have finalized records with the same nonce. Current relaxed chunk validation can record a failed InvalidNonce outcome without action receipts; runtime process_transactions handles TxVerdict::Failed separately. Duplicate-hash exclusion is not duplicate-nonce exclusion. The defensible guarantee is one successful nonce consumption/action-receipt creation, not absence of every failed on-chain record.
4. TransactionPool deduplicates hashes and permits conflicting nonces in its grouped vector; ordering revalidates against stored/pending constraints. A competing distinct hash is eligible on clean current state but is NOT guaranteed admission/routing/selection. One node may hold different pending state than another. There is no Ethereum fee-bump replacement guarantee or guaranteed removal of the original by submitting a competitor. Do not increase nonce/fees or repeatedly submit to force a winner.
5. InvalidNonce at an RPC is information about that node's effective nonce, not proof this specific original succeeded. A different transaction, pending reservation, stale/forked view, or key lifetime change can explain it. HTTP/pool rejection is not a finalized outcome. Even a final original root failure must be distinguished from failed native transfer or lost callback.

## Candidate, design only

Signer/receiver both **${c.signer}**. Exact key **${c.public_key}**. Exact nonce **${c.nonce}**. V0 with one Transfer action depositing **1 yoctoNEAR** to self, a new verified canonical reference block, no other action. No withdraw_claim, FunctionCall, deployment, key operation, FT/NFT transfer, issuance, repayment or default. Carol exists, is an ordinary named account with no code, and holds FullAccess permission. Transfer does not invoke a contract. It temporarily debits then credits the same 1 yocto; intended final effects are nonce advancement and network fees, not FLOOR state or permissions. Advancing the nonce is intentional key metadata consumption, not AddKey/DeleteKey or a permission change.

Transfer has **no gas-limit field**. Function-call prepaid gas is zero; using the original 110 Tgas or a wallet default would not be the protocol's transfer cost. At finalized ${s.block.height}/${s.block.hash}, ${utc}:

- Receipt+transfer send gas: ${c.send_gas}; execution gas: ${c.execution_gas}; total ${c.fixed_total_gas} gas = 0.446365125 Tgas.
- Current gas price ${c.current_gas_price} yocto/gas; minimum receipt purchase price ${c.minimum_purchase_gas_price}. From calculate_tx_cost, upfront=send×current_price+execution×max(current_price,min_purchase_price)+1.
- **Current quoted upfront ${near(c.current_upfront_total_yocto)} NEAR**. Quoted fee purchase ${near(c.current_fee_upper_at_quoted_prices_yocto)} NEAR. These are estimates/reservations from measured config, NOT actual fees of an executed fence. Price refunds may reduce final cost. Actual fence fee remains nonexistent/null.
- A proposed **0.001 NEAR operational allowance** covers this snapshot quote, but is not authorization and is not a hard on-chain cap. V0 Transfer has no max-fee/max-gas-price field. Repricing immediately before signing is necessary but cannot promise an immutable cap over a delayed signed transaction's full validity window.
- Protocol max_gas_price=${c.global_max_gas_price}; fixed-gas × that maximum is ${near(c.global_protocol_fee_upper_if_max_known_yocto)} NEAR, a conservative price ceiling calculation, NOT affordable or expected spend. Validation rejects costs above actual balance. With no incoming funds and this unchanged balance, Carol's ${near(s.carol_native.amount)} NEAR bounds affordable exposure; do not describe that conditional bound as a guaranteed 0.001 cap. An actual authorization must expressly define acceptable fee exposure, stale-signature handling and stop conditions. No account drain/funding/key change is proposed to manufacture a cap.

## Fresh read-only state and budget

At common finalized block ${s.block.height}, ${utc}, original still has no final outcome across public FastNear, dRPC and archival NEAR status calls. Exact raw queries/errors are in NONCE_FENCE_PREFLIGHT.json. Stored nonce ${a.nonce}; claim #16 Available state ${s.claim.state}, attempt ${s.claim.attempt}, amount 0.05 NEAR; inflight ${s.ledger.inflight}; FLOOR native ${near(s.floor_native.amount)}, required ${near(s.ledger.local_required)}; exact partition/native/storage coverage pass. Carol native ${near(s.carol_native.amount)}. NFT #15 belongs to Carol, loan Active/no pending transfer, collateral 0.10 FLOOR, principal 0.05 NEAR, repayment 0.055 NEAR.

Loan expiry **2026-11-14T04:04:11.656Z / November 14 09:34:11.656 IST**, exact ${s.loan.expiry} ns. Finalized time is before expiry by ${a.remaining_loan_ns} ns. Transfer→Dave repayment remains contractually possible before expiry if recovery resolves and fresh checks pass; it is not authorized here. If expiry arrives first, repay rejects and existing default_loan on an Active nonpending loan permits collateral to Bob; do not auto-settle. Borrower principal withdrawal and repayment are independent obligations.

Actual confirmed gross remains ${near(a.observed_gross_yocto)} NEAR; unknown fee null; reservation **0.142 NEAR retained**. Remaining after reservation ${near(a.remaining_after_reservation_yocto)} NEAR. No fence spend/reservation was charged and no refunds replenish gross. The earlier 10 NEAR cumulative DAO cap remains unchanged; this proposal has no DAO action.

## Exact future decision tree

${tree}

## Passive fallback

Reference height 277458923 + live validity ${a.validity_period} = **${a.expiry_threshold_prev_header_height}**. Pinned source checks the chunk's referenced previous-header height: Expired when that height is strictly greater than the threshold, followed by ancestry validation. Current finalized age ${a.finalized_height_age}: **not expired**. Once a finalized canonical header is beyond that threshold, any later successor referencing that header or later is beyond the old window. Do not infer expiration for every intervening chunk solely from wall time/current tip. Do not equate calendar duration with block validity.

At/after that point, still obtain target history/status, exact key/account continuity, no unexplained nonce changes, original acceptance-height/receipt ancestry if present, Available attempt-zero claim, inflight=0, borrower bucket/native balances and absence of outstanding original descendants. A pre-expiry original inclusion can have later asynchronous effects; age alone cannot clear it. Missing signatures/history, possible key resets, unknown callback or contradictory state means STILL_UNKNOWN. Expiration proves no future valid acceptance, not automatically no past inclusion.

## Recommendation

**NO-GO for an actual recovery transaction now; NONCE FENCE UNPROVEN overall.** Protocol-level design is plausible and source-supported. Required runtime both-orderings/routing proof remains NOT EXECUTED. A separate, explicit sandbox-signing authorization can enable that gate; only afterward consider bounded public-fence authorization with the exact candidate, key/nonce, complete winner evidence and honest fee terms. Existing acceptance authorization does not authorize this new operation. Original remains STILL_UNKNOWN; testnet acceptance NOT READY, mainnet NOT READY, FloorKit BLOCKED.
`);
fs.writeFileSync('acceptance-execution/NONCE_FENCE_SANDBOX_RESULTS.md',`# Nonce-fence sandbox results

**NOT EXECUTED / UNPROVEN — zero sandbox signatures, key creations or transactions.** Task 3 requests signed runtime races while this phase's strict rules prohibit all signing and key creation. The narrower explicit prohibition was honored; old sandbox signing permission was not reused to override it. No approved/public account was used. No existing test result was relabeled as this race.

Read-only version check succeeded: installed near-sandbox 2.14.0 commit ${comparison.sandbox_commit}, protocol 88; live nearcore 2.14.1 commit ${commit}, protocol 88. Pinned verify_nonce functions match exactly. Existing sandbox evidence covers financial receipts/callbacks but contains no identified proof of these exact same-key/same-nonce races. Version/source comparison is not proof of mempool routing or runtime outcomes.

The existing local sandbox is potentially suitable for regular V0 nonce semantics, but a faithful test must verify its protocol/config and compare the full validation/charge/pool paths or use a matching 2.14.1 binary. No new binary was installed. A single-node sandbox does not by itself prove two independently routed RPCs' mempool behavior; two genuine nodes on one test chain or clearly labeled fault-injected clients would be needed for the respective claims.

Required future test A (original first): on disposable pre-existing sandbox identities after signing authorization, build distinct financial and benign unsigned payloads with the same key/n. Finalize original admission and child transfer/callback. Observe key n before receipt completion where feasible. Submit fence once; record exact RPC rejection or finalized failure, not presumed success. Show exactly one action-receipt creation and original paid/failure/pending state. A rejected fence cannot cancel original descendants. **Expected from source; NOT observed here.**

Required future test B (fence first): finalize self-transfer at n; verify single action, key/n/receipt identity, fee-only native delta and unchanged financial claim. Attempt original once on sandbox only; record InvalidNonce rejection or failed finalized record, no original action/payout receipt. Read key/claim/native state again across finalized blocks. **Expected from source; NOT observed here.**

Required concurrent/routing variants: present distinct hashes at same nonce to two actual test RPC nodes; capture admission, forwarding, pending views, capacity/rate-limit rejection, selection, final winner and every receipt. A stale second RPC may report UNKNOWN even after a verified final winner. No automatic rebroadcast or fee-bump replacement behavior should be assumed. Also test original root failure, successful root with pending payout, transfer failure, missing callback, unrelated key advancement and key-lifetime discontinuity. **No runtime PASS is claimed.**

Evidence gate: original unsigned/signed public metadata, actual hashes/signers/key/nonces/reference blocks, node version/config, before/after finalized nonces, root/child receipt graphs, native debit/refund/fees and claim attempts, both orderings, routing observations and explicit fault-injection labels. Protect all sandbox secrets. Until then NONCE FENCE remains UNPROVEN.
`);
fs.writeFileSync('acceptance-execution/NONCE_FENCE_DECISION_GATE.md',`# Nonce-fence decision gate

**NONCE FENCE: UNPROVEN. NO-GO for public execution now.**

Protocol 88 V0 monotonic nonce rules support one successful nonce consumption/action-receipt creation at exact key/n. Conflicting hashes can coexist in pools; admission/selection is not guaranteed. Invalid-nonce finalized failure records may exist; do not equate finality with successful nonce consumption. Rejection of a proposed fence does not establish original payout completion.

Candidate design: Carol→Carol, exact ed25519 key from the original public payload, exact nonce 277184559000010, one Transfer of 1 yocto, V0, no FunctionCall/key operation/FLOOR mutation. Current fixed gas 446365125000; quoted upfront ${near(c.current_upfront_total_yocto)} NEAR. Proposed 0.001 NEAR operational allowance is NOT current authorization or an encoded hard fee cap. Future transaction signing needs refreshed quote, explicit fee-exposure terms and sufficient remaining budget; no automatic retry. Original 0.142 reservation remains intact.

Fresh block ${s.block.height}/${s.block.hash}, ${utc}: nonce ${a.nonce}, claim #16 Available/attempt 0, inflight 0, solvent; Active loan #15 and Carol NFT ownership, 0.10 FLOOR collateral. Original not expired: age ${a.finalized_height_age}/86400. Loan repayment path still time-eligible at this snapshot; expiry November 14 09:34:11.656 IST. No financial action taken.

Both real sandbox orderings/routing tests are unexecuted because this phase prohibits signing/key creation. Installed sandbox 2.14.0/protocol88 has identical verify_nonce logic to live2.14.1 but that alone is not runtime proof. Separate sandbox-only signing authorization is reasonable. An actual public fence is only reasonable to consider after those tests, fresh target-status checks and a concrete bounded authorization; do not ask the user to approve an unverified success claim.

${tree}

Passive fallback: finalized canonical previous-header height strictly >277545323 excludes later valid acceptance under current config. Reconcile earlier inclusion/receipts, continuous key/account history, nonce, Available attempt-zero claim, native balances and inflight before declaring nonexecution. No wall-clock conversion or expiry-only resolution.

${p.integrity.original_files_checked} pre-existing tracked/Phase2A evidence files unchanged, approved FLOOR/FloorKit artifacts unchanged; zero signatures/key/mainnet/financial operations. Sources/new report files are E-drive-only. No old journal, recovery or acceptance report was edited. No frontend/contract/DAO/FloorKit change.

Required before actual recovery: separately authorize disposable sandbox signing; obtain real both-ordering and routing evidence; freshly recheck exact public key/nonce/reference validity/claim/receipts/time/budget; freeze the candidate and explicit spend terms; obtain separate public-fence authorization; then verify a FINAL successful winner and every descendant before any new withdrawal.

RECOVERY: STILL_UNKNOWN
TESTNET ACCEPTANCE: NOT READY
MAINNET: NOT READY
FLOORKIT: BLOCKED
`);
console.log('Created three reports; nonce-fence UNPROVEN, no signing/broadcast');
