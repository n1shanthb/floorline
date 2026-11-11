"""Build reports from recorded evidence, never from invented runtime values."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/'evidence'/name).read_text())
run=read('SANDBOX_RESULTS.json');supp=read('SUPPLEMENTAL.json');audit=read('ARTIFACT_AUDIT.json')
parity=read('ECONOMIC_PARITY.json');wasm_parity=read('WASM_MODEL_PARITY.json');final=read('FINAL_CHAIN_RECONCILIATION.json')
assert run['error'] is None and supp['error'] is None
artifact=audit['artifacts']['floorkit.wasm'];sha=artifact['sha256']
assert run['normal_wasm_sha256']==wasm_parity['wasm_sha256']==sha
rows=[e for e in run['evidence'] if 'gas_burnt' in e]
gas={}
for e in rows:
    group=gas.setdefault(e['method'],{'samples':0,'minimum_total_receipt_gas':None,'maximum_total_receipt_gas':0,'prepaid_gas_values':set()})
    used=int(e['gas_burnt']);group['samples']+=1;group['minimum_total_receipt_gas']=min(group['minimum_total_receipt_gas'] or used,used);group['maximum_total_receipt_gas']=max(group['maximum_total_receipt_gas'],used);group['prepaid_gas_values'].add(e['prepaid_gas'])
for g in gas.values():g['prepaid_gas_values']=sorted(g['prepaid_gas_values'])
callbacks=[]
for e in run['evidence']:
    for receipt in e.get('raw',{}).get('receipts_outcome',[]):
        if any('"event":"claim_result"' in log for log in receipt['outcome']['logs']):
            callbacks.append({'scenario':e['name'],'receipt_id':receipt['id'],'gas_burnt':receipt['outcome']['gas_burnt']})
first=next(e['after'] for e in rows)
history=[e for e in rows if e['name'].startswith('history_')]
history_profile=[{'name':e['name'],'gas_burnt':e['gas_burnt'],'storage_bytes':e['after']['storage_bytes'],
                  'allocated_claim_count':(int(e['after']['K'])-int(e['after']['base_storage']))//int(e['after']['claim_storage'])} for e in history]
storage={'base_prepaid_yocto':first['base_storage'],'maximum_claim_prepaid_yocto':first['claim_storage'],
         'maximum_ft_call_prepaid_yocto':first['ft_call_storage'], 'initial_runtime_storage_bytes':first['storage_bytes'],
         'operational_reserve_yocto':first['O'],
         'observed_accepted_redemption_storage_deltas':sorted({e['storage_delta'] for e in rows if e['method']=='redeem' and not e['expected_failure']})}
profile={'status':'PASS for recorded bounded cases only','scope':'Total gas includes transaction and receipts. Groups include rejected calls and explicitly labeled fault scenarios; not a universal gas bound.',
         'gas_by_method':gas,'normal_native_callback_receipts':callbacks,'storage':storage,'history_profile':history_profile,
         'normal_callback_prepaid_gas':'30000000000000','fault_callback_prepaid_gas':'1000000000',
         'history_first_last_gas_equal':history[0]['gas_burnt']==history[-1]['gas_burnt']}
(ROOT/'evidence/GAS_STORAGE.json').write_text(json.dumps(profile,indent=2)+'\n')

def write(name,text):(ROOT.parent/name).write_text(text.strip()+'\n',encoding='utf8')

write('PHASE1_RUNTIME_RESULTS.md',f'''# FloorKit Phase 1 runtime results

Status: **PASS for executed scenarios; deployment gate remains BLOCKED / NO-GO.**

One isolated Rust/near-sdk implementation exists under `floorkit/contract/`.
Its public implementation covers immutable initialization/config/metadata,
NEP-141 transfers and transfer-call resolution, the restricted NEP-145 profile,
after-fee minting, exact quotes/slippage/deadlines, creator credit, redemption,
terminal closure, explicit contributions, funded claims, native callbacks,
conservative failed restoration, paid cleanup, storage funding and the eight-slot
operational refund pool. Maps and aggregate counters avoid history scans.

Executed evidence:

- Eight native Rust boundary/adversarial tests passed.
- 10,000 native economic sequences / 640,000 operations and 10,000 full-width
  quote cases matched the unchanged Python model. No economic failing seeds.
- **{run['test_count']} real sandbox scenarios passed**, with {len(run['evidence'])} recorded evidence entries.
- Two supplemental real scenarios passed, with {len(supp['evidence'])} additional entries:
  full exit during an actual pending FT resolver, and unrelated-user unregister
  denial after eight callback losses. The second is a reproduced availability
  limitation, not evidence that availability passed.
- 64 executed randomized WASM economic operations matched Python R/T/F/C.
- Final eight local test instances reconciled supply to known holder
  balances, actual native A, P, storage stake, immutable parameters and code hash.
  The supplemental closure instance and post-denial pool state are included.

Actual receipts include native success/failure, account deletion before payout,
known-failure restoration, overlapping dispatch, callback gas exhaustion,
conservative restoration blocked by another paid-but-unacknowledged attempt,
and separately funded cushion restoration without another payment of that attempt.
FT accept/reject/panic/malformed/oversized/exhausted/forward/redeem and attempted
force-unregister during resolution were executed. Canonical JSON, expiry,
one-yocto guards, storage shortage, partial/all automatic storage payouts, sponsor
refund, missing-user unregister, paid cleanup, maximum AccountId and wide math
also executed. Full exit refused reopening and paid existing claims after closure.

The harness checked A>=P and actual storage stake<=K+O after measured calls,
positive-supply cross-product monotonicity, and aggregate rollback on failing
root method receipts. It did not substitute scheduling or parent success for
payment. Detached NEP-145 callbacks can fail while the parent succeeds.

Boundary: local NEAR sandbox 2.14.0, protocol 88, port 3032, disposable keys only.
No public-testnet transactions, explorer links or public deployments exist for
this Phase 1 artifact. Normal WASM SHA-256: `{sha}`.

Not exhaustive: no forced protocol-level permutation of every debit/refund/
callback ordering; no real duplicate delivery from NEAR; no arbitrary high-history
bound beyond the measured samples; no independent security audit. Direct forged
callbacks reject, fresh retry nonces are observed, and code guards stale attempts,
but these are not a claim that every asynchronous ordering ran in WASM.

Earlier harness failures are retained: a mistaken expected FT refund ignored
preexisting fungible receiver balances; setup initially reused an owner name;
one intermediate evidence-file write failed transiently. Those were harness/setup
faults, not financial invariant failures. Historical files are not current results.
''')

write('PHASE1_MODEL_PARITY.md',f'''# FloorKit Phase 1 model parity

Status: **PASS for the explicitly compared fields; full storage/transport parity
is not claimed.** The approved Phase 0 source was not edited.

Native Rust economic port: 10,000 sequences of 64 operations, 640,000 total;
{parity['accepted']} accepted and {parity['rejected']} rejected, plus 10,000 full-width quote cases.
All accepted/rejected outcomes and R/T/F/closed snapshots matched Python. Rust
also checked rejection atomicity and positive-supply cross products per step.
Trace SHA-256: `{parity['trace_sha256']}`. Seeds 0–9999; no failing economic seed.

Actual compiled WASM: 64 randomized mint/redeem/contribution operations,
generator seed `0x464c4f4f`. Python Coin replay compared acceptance and before/after
R/T/F/C for every operation. Trace SHA-256: `{wasm_parity['trace_sha256']}`.
Expiry is modeled with now=1 against deadlines 0/MAX; actual chain timestamps
advance naturally. This does not pretend those timestamps are identical.

H/K use abstract units in Python and measured serialized bytes in Rust. A/U/Q
depend on real protocol transport, gas rewards and prefunding. Claim IDs differ
when setup/storage transitions differ. We therefore do not label normalized
economic parity as byte-for-byte full state-machine parity. Actual claims/storage/
transport were separately exercised in receipts and reconciled, not fabricated
as model oracle events.

Exact invariant for positive before/after supply:
`R_after*T_before >= R_before*T_after`. Net-priced mint satisfies mR<=nT;
partial redemption satisfies qT<=Rc. Transfers/storage/creator/native settlement
leave R/T unchanged. Full exit pays R into one funded claim, sets R=T=0, and
closes permanently. This is accounting backing, not a market-price guarantee or
a promise that every fixed-size redemption quote rises.

U512 intermediates and checked narrowing implement one final curve division.
Actual WASM bootstrapped supply 10^38 with price=1 and seed=10^14 yoctoNEAR,
redeemed half for exactly 45,000,000,000,000 yoctoNEAR, and rejected an overflowing
mint quote. Native tests also cover U128::MAX full redemption and aggregate
overflow rejection. The stronger fixed-size quote claim remains disproved.

Reference model SHA-256: `{wasm_parity['reference_model_sha256']}`.
Executed normal WASM SHA-256: `{sha}`.
''')

write('PHASE1_GAS_STORAGE.md',f'''# FloorKit Phase 1 gas and storage

Status: **PASS for measured cases; not an exhaustive protocol-cost guarantee.**
`contract/evidence/GAS_STORAGE.json` contains exact integer gas, prepaid budgets,
receipt IDs, storage deltas and history profiles. Raw outcomes are retained.

At 10^19 yoctoNEAR/byte, maximum serialized-row probes prepaid:

- User base plus one fixed refund slot: {storage['base_prepaid_yocto']} yoctoNEAR (409 bytes).
- Ordinary native claim: {storage['maximum_claim_prepaid_yocto']} yoctoNEAR (228 bytes).
- Pending FT call: {storage['maximum_ft_call_prepaid_yocto']} yoctoNEAR (217 bytes).

Actual accepted redemption row growth included {storage['observed_accepted_redemption_storage_deltas']} bytes;
228 occurred for the maximum-length owner/payer. Paid rows remain allocated until
cleanup. Unregister refunds the prepaid base; pooled replacement storage is
protected by separately funded O. Callback fields and pool slots are fixed width.
Every measured accounting snapshot covered actual storage stake with K+O.

Normal WASM size: {artifact['bytes']} bytes. The test separately declared 5 NEAR O;
initialization rejected an earlier 3-NEAR test setup that could not cover code,
state and pool headroom. Excess prefunding was never inferred as backing.

Normal callbacks receive 30 Tgas; FT receiver receives 50 Tgas, both zero unused
gas weight. Promise paths enforce 150 Tgas upfront. Normal FT cases ran at 150
Tgas, including receiver exhaustion and oversized data; a maximum-name redemption
ran at 40 Tgas and its native payout at 150 Tgas. Bounded result decoding avoids
copying an unbounded receiver return into callback memory. Native unexpected
result size leaves the attempt unresolved rather than labeling it a failed send.

The deliberately separate fault artifact allocates only 0.001 Tgas and produced
actual callback failure. It is never a deployable recommendation. A successful
normal callback sample does not prove the exact minimum necessary callback gas.

The 48 added historical redemptions reached {history_profile[-1]['allocated_claim_count']} allocated claims.
First/last total receipt gas was {history[0]['gas_burnt']} / {history[-1]['gas_burnt']}, equal in
this run. Source writes touch bounded rows; the only pool walk is capped at eight.
This is measured history behavior, not an empirical test of every possible
history size, maximum metadata/string combination or future protocol revision.

Native/FT payouts use separately funded buckets; caller gas is not debited from R.
The test assumes the admitted storage/gas regime and excludes an adversarial
retained full-access spender. Local test keys were retained, so production
immutability cannot be inferred from these measurements.
''')

write('PHASE1_SECURITY_REVIEW.md',f'''# FloorKit Phase 1 security review

Verdict: **BLOCKED for public deployment; no backing/solvency counterexample
observed in the executed admitted scenarios.** This is an implementation review,
not an independent audit or formal verification.

The funded partition is P=R+C+F+H+K+O. Executed checks require A>=P and actual
storage stake<=K+O. I represents unresolved sends and is outside P; always
requiring A>=P+I would double-count debited payouts. Known-failure restoration
alone requires A>=P+I. It converts one funded failed entitlement back to C and
never touches R. Unknown attempts cannot be retried, timed out or swept.

Private callbacks consume actual bounded PromiseResult data and matching IDs/
nonces, not caller-supplied success flags. Payment is recognized only on a real
successful callback. Failure does not optimistically credit C. Redemption and
creator conversion each replace their original bucket exactly once. FT resolver
refund is capped by available receiver tokens and cannot burn a missing sender;
participant references prevent unregister until settlement. Source review found
no setters, reserve/O/U sweep, arbitrary burn, loan, factory, migration or owner
dispatch method.

Release blocker: the fault test lost eight pooled-refund callbacks. The pool
remained occupied permanently; an unrelated newly registered empty user could
not unregister. The ninth refund and unrelated unregister rejected atomically,
so reserve and liabilities remained funded. The model has no safe recovery for
unknown outcomes: the original transfers may already have paid. Recycling these
slots or timeout repayment would weaken safety. A larger pool postpones the
limit without resolving it. This is an unacceptable unresolved global availability
failure for a publicly offered reference coin; do not hide it behind solvency.

Important boundary: callback loss was induced with a separately compiled
0.001-Tgas artifact. Normal 30-Tgas callbacks passed measured cases. We did NOT
prove that an ordinary attacker can force those losses on the normal artifact.
We also did not prove they can never occur. Known-failure retry can remain blocked
by another paid-but-unacknowledged attempt even after its own refund returns;
actual receipts reproduced this conservative liveness tradeoff.

Upgrade/key review: local accounts retain disposable full-access keys. A local
fault fixture was explicitly redeployed to normal callback gas while preserving
an old unknown attempt; this is test preparation, not an admitted economic
operation or immutability demonstration. No existing Floorline/DAO keys were read,
changed or deleted. No public keys were deleted for lock-down.

The generated normal WASM retains SDK generic Promise imports for deploy, keys,
delete-account and globals. An initial import-absence assertion FAILED and is
recorded in ARTIFACT_AUDIT.json. Inspection of near-sdk 5.30.1 promise.rs shows
generic action dispatch retains these branches. FloorKit source constructs only
transfer and bounded function-call actions with fixed method names; no JSON
action dispatcher or privileged exported method was found. Import presence is
not itself an exploit, and import/export listing is not a complete bytecode
reachability proof. Do not claim that such a proof passed.

Future lock-down would require a separately authorized regular local-code
deployment+atomic initialization, exact artifact/code-reference match, complete
reachable action review, verified zero-key evidence after separately authorized
lock-down, and checks excluding mutable global aliases. Zero keys alone is not
sufficient. Current actual immutability: **NO**.

Other limits: ordering/slippage and dust; size-dependent tax/full-exit exemption;
permanent terminal closure; gas rewards/direct cash trapped as unallocated;
no market floor, callback-delivery guarantee or future-protocol guarantee;
uint macro compiler warnings; incomplete exhaustive runtime ordering coverage.
Do not modify the approved Phase 0 model to conceal these findings.
''')

gate={'status':'BLOCKED','deployment_recommendation':'NO-GO',
      'reason':'Unresolved global unregister availability after eight unknown operational-refund callbacks; incomplete exhaustive async/bytecode review',
      'native_rust_tests':8,'native_economic_sequences':10000,'native_economic_operations':640000,
      'full_width_quote_cases':10000,'sandbox_primary_scenarios':run['test_count'],
      'sandbox_supplemental_scenarios':2,'wasm_randomized_operations':64,
      'backing_and_solvency_in_executed_cases':'PASS','full_transport_model_parity':'NOT CLAIMED',
      'actual_immutable':False,'wasm_sha256':sha,'near_code_hash':artifact['near_code_hash'],
      'protected_preexisting_files_unchanged':215,'protected_phase0_files_unchanged':22,
      'public_testnet_deployment':False,'private_existing_credentials_accessed':False}
(ROOT/'evidence/PHASE1_GATE.json').write_text(json.dumps(gate,indent=2)+'\n')
write('PHASE1_DEPLOYMENT_GATE.md',f'''# FloorKit Phase 1 deployment gate

**BLOCKED / NO-GO for public-testnet deployment. No deployment authorization is
being exercised. Stop new feature work and resolve the security/design gate.**

- Implementation: isolated Rust/near-sdk persistent contract, normal WASM,
  separate receiver and callback-loss artifacts, reproducible E-drive scripts.
- Rust: eight tests PASS; 10,000 economic sequences / 640,000 operations plus
  10,000 wide quote cases PASS against unchanged Python.
- Real WASM: {run['test_count']} primary scenarios plus two supplemental scenarios PASS
  as tests of their stated outcomes. The reproduced denial is not an availability
  pass. 64 randomized WASM economic operations match Python R/T/F/C.
- Executed backing/solvency: PASS within recorded cases and stated environment.
  Full-exit closure, callback loss, real native failure, pending FT closure,
  creator segregation and failed-restoration cushion were exercised.
- Callbacks: no unfunded claim/double payment observed; unknown outcomes fail
  closed. **Availability FAILS after the reproduced pooled callback-loss case.**
- Storage/gas: measured byte costs and receipt gas passed recorded cases;
  40/150-Tgas calls and 30-Tgas callbacks worked, with bounded row growth and
  equal first/last gas over the 48 added historical claims. Not an exhaustive bound.
- Immutability: **NOT ESTABLISHED**. Local disposable full-access keys retained;
  SDK generic privileged imports remain. Source found no upgrade/admin dispatch,
  but a complete independent bytecode reachability proof is not claimed.
- Integrity: all 215 preexisting protected files and 22 Phase 0 files unchanged.
  Existing Floorline contracts, DAO, frontend, evidence and credentials untouched.

Normal artifact SHA-256: `{sha}`.
Derived and locally verified NEAR code hash: `{artifact['near_code_hash']}`.
Compiler Rust 1.99.1; near-sdk 5.30.1; borsh 1.8.1; uint 0.9.5. Lockfiles and
ARTIFACT_AUDIT.json record build/source versions and all three artifact hashes.

The operational refund pool can permanently prevent unrelated empty users from
unregistering after eight unknown outcomes. Solvency holds, but promising normal
storage-refund availability would be misleading. The result was induced using
fault callback gas, not demonstrated as a normal-artifact attacker exploit.
Changing recovery semantics requires an explicitly reviewed design update and
new Phase 0/runtime evidence; timeout repayment or silently enlarging the pool
does not establish safety and liveness. Existing approved research remains frozen.

Remaining verification limits include arbitrary protocol callback/debit/refund
permutations, true duplicate/stale delivery, full native/storage/transport oracle
parity, exhaustive maximum-state gas and independent action-reachability review.
No fabricated receipts or public-testnet evidence are supplied.

Do not build a factory, frontend or public deployment around this artifact.
Keep the existing Floorline submission viable. If the revised design and actual
runtime gate are not green at least 24 hours before the supplied November 14
cutoff, drop FloorKit from this hackathon rather than ship a financial promise
whose availability limitations are unresolved. Further public deployment remains
separately authorized even if a later gate passes.
''')
print(json.dumps(gate,indent=2))
