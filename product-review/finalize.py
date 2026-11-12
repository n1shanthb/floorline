"""Produce evidence-derived results and a protected-file integrity verdict."""
from pathlib import Path
import hashlib
import json
import subprocess
ROOT=Path(__file__).resolve().parent.parent
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
baseline=read('product-review/INTEGRITY_BASELINE.json')
changed=[p for p,h in baseline['protected_sha256'].items() if sha(ROOT/p)!=h]
assert not changed,changed
floor_hash=sha(ROOT/'runtime/artifacts/floorline.wasm')
assert floor_hash=='529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6'
kit=read('floorkit/contract/evidence/ARTIFACT_AUDIT.json')
kit_hashes={name:sha(ROOT/'floorkit/contract/artifacts'/name)==info['sha256'] for name,info in kit['artifacts'].items()}
assert all(kit_hashes.values())
unit=read('frontend/qa/product-completion/unit-results.json')
browser=read('frontend/qa/product-completion/browser-results.json')
captures=read('frontend/qa/product-completion/production-browser.json')
live=read('product-review/LIVE_TESTNET_READS.json')
rebuild=read('product-review/REPRODUCIBLE_BUILD.json')
audit=read('frontend/qa/product-completion/dependency-audit.json')
assert unit['numFailedTests']==0 and browser['stats']['unexpected']==0
assert len(captures['results'])==12 and all(not r['runtime_errors'] and not r['overflow'] for r in captures['results'])
assert rebuild['byte_for_byte_match'] and rebuild['approved_artifact_unchanged']
assert not live['errors']
files=subprocess.check_output(['git','diff',baseline['head'],'--name-only'],cwd=ROOT,text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines()
build_manifest={'source_sha256':{str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'frontend/src').rglob('*')) if p.is_file()},
                'package_lock_sha256':sha(ROOT/'frontend/package-lock.json'),
                'built_files_sha256':{str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'frontend/dist').rglob('*')) if p.is_file()},
                'scope':'Local production build only; no hosting/deployment claim'}
(ROOT/'product-review/FRONTEND_BUILD_SHA256.json').write_text(json.dumps(build_manifest,indent=2)+'\n')
integrity={'status':'PASS','baseline_head':baseline['head'],'protected_tracked_files':len(baseline['protected_sha256']),
           'changed_protected_files':changed,'approved_floor_wasm_sha256':floor_hash,
           'floorkit_ignored_artifacts_unchanged':kit_hashes,
           'existing_contract_source_evidence_frontend_history_and_floorkit_unchanged':True}
(ROOT/'product-review/INTEGRITY_RESULTS.json').write_text(json.dumps(integrity,indent=2)+'\n')
checks={'typecheck':'PASS','lint':'PASS','production_build':'PASS','unit_tests_passed':unit['numPassedTests'],
        'unit_tests_failed':unit['numFailedTests'],'browser_scenarios_passed':browser['stats']['expected'],
        'browser_scenarios_failed':browser['stats']['unexpected'],'production_captures':12,
        'production_overflow':0,'production_runtime_errors':0,
        'fresh_historical_receipts_verified':sum(t['result']=='VERIFIED FINAL SUCCESS' for t in live['historical_transactions']),
        'new_signed_testnet_transactions':0,'private_keys_accessed':False,'mainnet_transactions':0,
        'public_deployments':0,'approved_artifact_byte_reproducible':True,
        'testnet_verdict':'NOT READY: new wallet-signed acceptance pending',
        'mainnet_verdict':'NOT READY: independent security and release gates outstanding',
        'floorkit_deployment_status':'BLOCKED','dependency_advisories':audit['metadata']['vulnerabilities'],
        'files_changed':sorted(set(files))}
(ROOT/'product-review/FINAL_CHECKS.json').write_text(json.dumps(checks,indent=2)+'\n')
history='\n'.join(f"- `{t['id']}`: [{t['hash']}]({t['explorer']}) — {t['result']}." for t in live['historical_transactions'])
modified='\n'.join(f'- `{p}`' for p in files if not p.startswith('frontend/qa/product-completion/') and not p.startswith('product-review/'))
l=live['floor']['ledger']
text=f'''# Testnet acceptance results

**TESTNET NOT READY for complete frontend-signed acceptance.**
**MAINNET NOT READY.** Prepared acceptance cases remain unsigned.

## Completed work

Audited existing frontend routes/components, deployed Rust adapter, engine/API
boundaries, tests, wallet selector, RPC configuration, offer proofs, asynchronous
claims, Sputnik policy and original evidence. Retained the current design.
Added existing-method FLOOR transfer, explicit contribution, unused storage
withdrawal and real reviewed Sputnik proposal/approval controls. Added a browser
transaction log separate from historical replay and explicit short offer terms
for controlled default tests. No new contract capability or factory was invented.

Financial preflight pins account/loan/claim reads to one finalized block, validates
deposits/canonical amounts/gas and exact receipts, checks reserve partition and
eligibility, bounds expiry arithmetic and rejects changed DAO code/policy.
Reconciliation refreshes balances/loan/NFT/proposal views; unknowns never auto-retry.
Root withdrawal failure is preserved as failed; nonfinal failures stay unknown.
Finalized known payout failure permits a separate, balance-guarded restoration;
it is not trapped behind the lost-callback quarantine. No payout is retried
automatically and no failure alone creates spendable credit.
Generic RPC rejection and untrusted callback URL errors cannot discard pending
intents. Explicit wallet cancellation remains separate from uncertain submission.

## Checks actually executed

- TypeScript, ESLint and production build: PASS.
- Unit tests: **{checks['unit_tests_passed']} passed, {checks['unit_tests_failed']} failed**. Includes the existing
  10,000 integer curve cases, admission, DAO constraints and intent matching.
- Browser tests: **{checks['browser_scenarios_passed']} passed, {checks['browser_scenarios_failed']} failed** using isolated mocked
  wallet/RPC adapters. All six routes at 360/390/1440 widths, keyboard modal,
  disconnected/wrong-network/RPC errors, insufficient funds, exact repayment,
  wallet rejection, unknown/failed outcomes, proposal/transfer review, short term
  review, post-receipt balances/NFT updates and forged callback errors tested.
  These synthetic receipts are NOT public-chain transactions.
- Production browser: **12 live-read-only desktop/mobile captures**, no runtime
  exceptions or horizontal overflow. Anonymous wallets; no authentication/signing.
  Images in `frontend/qa/product-completion/`; layout padding was corrected after
  visual inspection. This is Chromium responsive QA, not physical-device proof.
- Public testnet recheck: finalized chain/network/code/accounting, quote parity,
  known loans/claims/NFT state, complete DAO policy, public key listings and seven
  original successful transactions verified. Fresh source data:
  `product-review/LIVE_TESTNET_READS.json`.
- Isolated offline Rust rebuild: byte-for-byte match to approved FLOOR WASM;
  original artifact unchanged. No deployed contract was modified/redeployed.
- Dependency audit: **10 low, 0 moderate/high/critical** current registry findings.
  No dependency update or unsafe forced fix. Existing upstream direct-eval/browser
  polyfill warnings remain in build logs; no audit/CSP certification is claimed.

Early browser runs failed because the test wallet mock lacked the new receiver
helper and the mock returned FLOOR's code hash for the DAO. Logs were retained
as `initial-mock-failure.txt` and `second-mock-failure.txt`; final fixtures were
corrected and the full suite rerun. These are resolved test-fixture failures,
not fabricated successful live acceptance.

## Actual public-chain transaction evidence

The following are **historical hashes freshly rechecked**, not newly submitted
through this frontend. FINAL, signer/receiver identity and all receipts succeeded:

{history}

Explorer URLs are canonical transaction links. RPC evidence was verified; no
claim that every explorer HTML page was independently rendered is made.
New signed testnet transactions: **0**. Mainnet transactions: **0**.

At the recorded finalized block, L=`{l['L']}`, T=`{l['T']}`,
A=`{l['account_balance']}`, required=`{l['local_required']}` yocto units.
Available claims, locked collateral and inflight amounts were zero. Native cash
covers the reported partition; storage/operations cover recorded stake. Ratio
2019/1900 is backing, not a guaranteed redemption price. Current positive fixed
1:1 issuance is correctly blocked, not silently repriced or labeled completed.

## Remaining acceptance and security limits

No actual wallet authentication, user signature, new public receipt or physical
device acceptance was performed. New transfer/contribution/storage and Sputnik
controls remain IMPLEMENTED BUT UNVERIFIED with real signatures. Current proposal
#0 is already Approved. Fresh borrowing needs existing-holder collateral because
issuance is gated. Follow TESTNET_ACCEPTANCE_PLAN.md with actual role-wallet
operators, the approved funding ceiling, fresh IDs and full receipt reconciliation.

Discovery is partial; no global live indexer, unregister/cleanup or generic
transfer-call UI is claimed. Unknown native/storage outcomes can strand rights;
no unsafe automatic recovery was added. Hosting/publication was not authorized
or performed. Independent mainnet security, custody, exposure, monitoring and
network release gates remain outstanding; FLOOR still has one full-access key.
DAO council remains operator-controlled simulated council, not independent humans.

FloorKit remains BLOCKED. No FloorKit file or integration was changed. Its
availability redesign requires separate independent economic/runtime gates.

## Files and integrity

All **{integrity['protected_tracked_files']} protected tracked files** retain baseline hashes, including original
contract source/lockfiles, historical evidence, previous frontend QA/public replay
and all tracked FloorKit files. Approved ignored FLOOR WASM and all three ignored
FloorKit artifacts also match their recorded hashes. See INTEGRITY_RESULTS.json.

Approved FLOOR SHA-256: `{floor_hash}`.

Source/test/report changes (generated QA and read-only/build audit files are
additionally enumerated in `product-review/FINAL_CHECKS.json`):

{modified}

## Next actions

Obtain explicit wallet-led acceptance authorization and owner participation;
recheck balances/budget, run the plan's real cases and attach actual final hashes
and UI refresh evidence. Resolve every skipped/unknown/failed case before marking
TESTNET READY. Separately complete MAINNET_READINESS.md; do not deploy mainnet
or change the approved contract to make a review pass.
'''
(ROOT/'TESTNET_ACCEPTANCE_RESULTS.md').write_text(text,encoding='utf8')
print(json.dumps({k:v for k,v in checks.items() if k!='files_changed'},indent=2))
