# Floorline Gate 3 — public testnet core passed; governance paused

November 11, 2026. **The non-DAO public-testnet demonstration passed. Gate 3 as a whole is incomplete; NO-GO for frontend development until genuine independent council governance passes.** No track has been removed and no simulated vote or local donor fixture is substituted for public governance.

## Actual deployment

- Network: **NEAR testnet**, independently identified by both rpc.testnet.near.org and test.rpc.fastnear.com; protocol **88**. Current protocol storage cost: **10^19 yoctoNEAR/byte**; reported maximum total prepaid gas **10^15 gas (1000 Tgas)**. The calls used lower explicit budgets, not the live maximum.
- Contract: **floor.floorline-g3-20261111-6702ea.testnet**.
- Approved WASM: runtime/artifacts/floorline.wasm, **443,613 bytes**.
- SHA-256 checked before deployment and independently rechecked against public view_code: **529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6**.
- Actual deployed code hash: **6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9**.
- Atomic account creation, funding, key installation, deployment and initialization transaction: **6mFfa348aj5E6TcZQSRyK2VmTcJeNtikxKaPsaE4agBJ**. Deployment and initialization therefore have the same real hash; they were batched to avoid an uninitialized-contract race. [Verified transaction data](https://api-testnet.nearblocks.io/v3/txns/6mFfa348aj5E6TcZQSRyK2VmTcJeNtikxKaPsaE4agBJ).
- Initial configuration: tax_bps=2000, immutable issuance_numerator="1", issuance_denominator="1". Initial actual balance **6 NEAR**, L=0, T=0, actual storage **444,147 bytes**, protected operational reserve **4.57891 NEAR**. Deployment funding was not booked as backing.

The normal artifact was neither modified nor rebuilt for this gate. No fault or receiver-fixture WASM was publicly deployed. All private role keys were freshly generated under a user-restricted E:\near-2\.testnet-credentials directory and never printed. Access keys are retained: this is **mutable, not ownerless or immutable**.

## Designated accounts and funding

Controller: floorline-g3-20261111-6702ea.testnet. The other designated accounts are the alice, bob, carol, dave and lender subaccounts of that controller. These are distinct on-chain test roles controlled by the project operator, **not independent DAO council members**.

A single official testnet-helper request created/funded the controller with 10 testnet NEAR and installed the locally generated public key. Key ownership was verified through view_access_key. Role allocations were: contract 6; Alice 2.2; Bob 0.2; Carol 0.2; Dave 0.4; lender 0.4 NEAR. Total role funding **9.4 NEAR**. Bob and Carol each received a recorded 0.05 top-up after an upfront-gas validation rejection; these were within the existing core budget, not new funding requests.

Independent final controller net outflow, including its actual costs: **9.4479816179383151 NEAR**, below the verified **9.5 NEAR** core cap. Remaining controller balance: **0.5520183820616849 NEAR**. No additional faucet grant, mainnet funds or DAO allocation was used. Actor execution costs are paid from their allocations and must not be counted again as extra funding.

## Actual chain results

**35 finalized demonstration transactions: 28 successes and 7 expected contract rejections.** The separate faucet/account-creation response is retained in testnet/evidence/funding.json; it is not silently counted among those 35. A failed pre-execution gas-reservation validation is recorded separately and is not presented as an executed transaction.

### Token mechanics

Alice issued **2 FLOOR for 2 NEAR**, transferred **0.4 FLOOR to Bob** and **0.5 FLOOR to Carol**. Bob redeemed **0.1 FLOOR**, received a funded **0.081 NEAR** claim, and withdrew it successfully.

- Issuance: [6TfeGDTc5YyPPXtKb1QbBd2XFsUHB2Wsx3eaTFaX8cHy](https://api-testnet.nearblocks.io/v3/txns/6TfeGDTc5YyPPXtKb1QbBd2XFsUHB2Wsx3eaTFaX8cHy).
- Redemption: [2YHTdYdgBtFfKuHXP1TAn2R7bpZ5fwkAiJdGNp2qQMLZ](https://api-testnet.nearblocks.io/v3/txns/2YHTdYdgBtFfKuHXP1TAn2R7bpZ5fwkAiJdGNp2qQMLZ).
- Actual payout: [8MrXrQCVhyhv4dJcAyRoUM8BsMjSky9x6ooRpFmch23t](https://api-testnet.nearblocks.io/v3/txns/8MrXrQCVhyhv4dJcAyRoUM8BsMjSky9x6ooRpFmch23t).

Before redemption L/T=2/2=1; afterward **L/T=1.919/1.9=1.01 NEAR per FLOOR**. Exact integer cross-products confirmed strict increase. This is the backing ratio, **not a guaranteed redemption price or USD floor**. A subsequent 0.05-NEAR issuance attempt was rejected with “dilutive issuance”; duplicate withdrawal was rejected.

### Transferable loan NFT

The lender separately funded **0.1 NEAR**, with fixed debt **0.11 NEAR**, collateral **0.2 FLOOR**, and a one-hour term. Carol locked existing FLOOR, received the real NFT and principal claim, and withdrew the principal. Carol transferred the NFT to Dave. Carol's attempted repayment was rejected as “not NFT owner.” Dave paid exactly 0.11 NEAR, received 0.2 FLOOR, the NFT became null, and the lender withdrew its funded repayment claim. L and T were unchanged across every loan action.

- Funded offer: [5uXjXAQyaXxtsK5jPFQsN6zcznFSLDQXK2oQz83AJi5V](https://api-testnet.nearblocks.io/v3/txns/5uXjXAQyaXxtsK5jPFQsN6zcznFSLDQXK2oQz83AJi5V).
- Carol accepts: [fruyp8VSg3XmY5Nfwpqn2uBbPTGNZUgALxSfmPETW5e](https://api-testnet.nearblocks.io/v3/txns/fruyp8VSg3XmY5Nfwpqn2uBbPTGNZUgALxSfmPETW5e).
- Actual NFT transfer: [6kqBcUHPeT5TSFqjxLjq3AihsziHAWqUyVHjQFCmA9NV](https://api-testnet.nearblocks.io/v3/txns/6kqBcUHPeT5TSFqjxLjq3AihsziHAWqUyVHjQFCmA9NV).
- Dave repays: [5j1o8NzzTkNHHtjNuXGGRLHH9khwdZjURijicyps811M](https://api-testnet.nearblocks.io/v3/txns/5j1o8NzzTkNHHtjNuXGGRLHH9khwdZjURijicyps811M).
- Lender payout: [DR3mWu3j4TLdzJxjZ7V7rLKqfijphHYcKs4bsuCWYgYA](https://api-testnet.nearblocks.io/v3/txns/DR3mWu3j4TLdzJxjZ7V7rLKqfijphHYcKs4bsuCWYgYA).

Repeated repayment and default-after-repayment were rejected. Terminal get_loan state was Repaid(2); nft_token was null; principal/repayment claims were Paid(3). The evidence contains actual terms, balances, receipt outcomes and independent final views.

### Separate default

The lender funded a distinct **0.05-NEAR** offer, debt **0.055 NEAR**, collateral **0.1 FLOOR**, duration **60 seconds**. Carol accepted and withdrew principal. The client waited for actual testnet block time; no override was used. Permissionless default transferred 0.1 FLOOR to the lender and terminated NFT rights. Actual execution timestamp was checked against stored expiry using the execution block. Repayment-after-default and repeated default were rejected.

- Default offer: [27QnSpn4z5YpgmVQFvFnZesBL8QWg84q71fsDZR9g5rx](https://api-testnet.nearblocks.io/v3/txns/27QnSpn4z5YpgmVQFvFnZesBL8QWg84q71fsDZR9g5rx).
- Default: [5FVQb4KG8eTubJd8p5FaFBoBfCqoRPefBcA3qHCm8jfD](https://api-testnet.nearblocks.io/v3/txns/5FVQb4KG8eTubJd8p5FaFBoBfCqoRPefBcA3qHCm8jfD).

Terminal loan state was Defaulted(3); nft_token was null. L and T remained unchanged. Default produced collateral recovery, not a promise of native NEAR repayment.

## Solvency and final state

Every recorded financial boundary checked actual A>=R_local, separately funded storage, and known-role available FLOOR plus escrow exactly equal to T. Loan actions additionally checked exact preservation of L/T. Independent finalized reads rechecked the deployed bytecode, all four native payout claims, both terminal loan/NFT states, actual expiry comparisons and the budget.

```text
A                         = 8.169000000000000000000003 NEAR
R_local                   = 6.747910000000000000000003 NEAR
L                         = 1.919 NEAR
T                         = 1.9 FLOOR
storage deposits          = 0.25 NEAR
protected operational O   = 4.578910000000000000000003 NEAR
unallocated surplus       = 1.42109 NEAR
unused lender funding     = 0
available cash claims     = 0
native in-flight          = 0
locked FLOOR              = 0
actual storage usage      = 446338 bytes
```

Available FLOOR: Alice 1.1, Bob 0.3, Carol 0.2, Dave 0.2, lender 0.1. This sums to 1.9. Unknown-callback recovery was not fault-injected on public testnet because the authorized artifact must remain unchanged. Its fail-closed path is supported by the identical-artifact Gate 2 logic and separate local fault test, not misrepresented as a public failure/retry experiment.

## Public gas/storage observations

Total burned gas includes the transaction and receipt chain:

- Atomic create/deploy/initialize: **60.5972 Tgas**; initialized account storage **444147 bytes**.
- Issue: **2.4681 Tgas**, no state growth beyond existing records.
- Redemption: **3.0864 Tgas**, **179 bytes** for its funded claim.
- Offer funding: **2.7893–2.7911 Tgas**, **317 actual bytes** each; maximum-size allocation prepaid separately.
- Acceptance: **3.6022–3.6090 Tgas**, **139 net bytes**, including principal claim and owner/borrower field replacement.
- NFT transfer: **3.0057 Tgas**, **-1 byte** due to AccountId length.
- Repayment: **3.8072 Tgas**, **183 bytes** for the lender claim.
- Default: **3.1819 Tgas**, zero growth.
- Successful native withdrawal/callback chains: **5.5655–5.5818 Tgas**, zero attempt-state growth.
- Tested account registration: **182–185 bytes**, **2.5730–2.5867 Tgas**.

An initial 150-Tgas registration request for Bob failed **before execution** because the quoted upfront operation cost exceeded his 0.15-NEAR balance. This did not change the contract. Ordinary calls were reduced to **25 Tgas**, callback-bearing withdrawals to the enforced **110 Tgas**, and Bob/Carol received 0.05 each within the existing 9.5 cap. Live gas_price rechecks remained 10^8 yoctoNEAR/gas; the validation's full upfront reservation, not just consumed-gas cost, governs sender liquidity. The rejected signed hash is labeled unexecuted and has no invented successful receipt/link.

The legacy rpc.testnet.near.org later returned its deprecation/rate-limit error. The journal resumed through the independently verified FastNEAR endpoint. Known finalized transactions were not re-sent. Accepted-but-unknown hashes are reconciled before any retry; only a definitive pre-execution validation rejection was replaced. No financial invariant failed.

## Real Sputnik status — NOT PASSED

Per the user's clarification, **DAO creation and governance execution are paused** until three real council IDs and their owners' participation are confirmed: project operator plus two independently controlled signers. No council accounts were invented; no unrelated DAO/factory was made a council member; no locally generated role keys were described as independent governance. No project DAO exists, no proposal ID exists, and no votes or contribution transaction are claimed.

Read-only verification observed factory sputnikv2.testnet, code hash **77dkUJRCHKRxJxo6UtYgBtRP6hsEX2v4vXjmFuY7dktb**. Its default DAO metadata reported version **[3,31]**, code hash **AA4nA45vauiac3jdVwJTzSdUP3oj2r1fDaPAb2mHdgcH**, commit **7764926cfd3c47f62b5fcde231c251f3c3892887**. Downloaded default DAO code was **539647 bytes**; its hash and exports were retained. The factory-reported pinned source, rather than current main's newer global-contract assumptions, was downloaded.

That source computes legacy creation minimum `(code_len+32)*storage_byte_cost`, here **5.39679 NEAR** before extra account/configuration operating headroom. A 6-NEAR creation allocation is a candidate within the 10-NEAR ceiling, not an executed spend. The pinned default policy has a 1-NEAR proposal bond and strict-majority threshold; actual new-DAO policy must still be read and verified. Existing factory-listed DAOs can have other versions/policies and were used only for read-only interface inspection, never for votes or funds. No reproducible source-to-factory-binary attestation is claimed.

Current controller balance alone is insufficient for DAO creation plus the proposal bond. Obtain legitimate additional testnet funding within a freshly verified DAO budget once genuine participants are ready; do not silently exceed the cap or reclaim protected Floorline funds. The actual Floorline contribution payload is prepared in testnet/prepared-contribution-proposal.json but is unsigned and unsubmitted.

## Evidence and explorer verification

TESTNET_EVIDENCE.json contains actual accounts, artifact/code hashes, signed intent hashes, finalized RPC outcomes, expected failures, before/after state, gas, budget, independent final views and explicit empty/unverified DAO fields. testnet/evidence/summary.json summarizes actual measurements. No private keys or seed phrases are included.

Canonical NearBlocks UI links are recorded, but the agent's HTML fetches returned HTTP 403 and are **not labeled as rendered/verified pages**. The old v1/v2 transaction APIs returned HTTP 410 because testnet now uses v3. **All 35 finalized transaction records were independently matched by hash, signer and receiver in the current v3 index**, using HTTP 200 transaction-data URLs. Those are the verified links above. Initial indexer throttling was followed by a cooldown and bounded seven-second spacing; no authentication bypass or paid service was used. RPC finality remains the authoritative receipt evidence. The client now stops at the first HTTP 429 rather than continuing requests.

## Operational/security limitations and decision

This is an **unadvertised controlled-use demonstration**, not a technically private or permissioned deployment. Payable methods remain publicly callable; there is no on-chain deposit allowlist. No outside deposits were solicited, and all planned financial calls used designated accounts. Full-access keys remain; unknown callback outcomes can strand claims/rights; full standards certification/audit and remaining Gate 2 corner cases are not claimed. Testnet results do not imply a positive atomic redemption minimum, a USD floor or lender principal guarantee.

**NO-GO for frontend development/full Gate 3 completion at this point.** Token and NFT core paths are publicly proven, but the independent-majority Social Money demonstration is missing. Continue the governance part only when the real council IDs, owner participation and budget are available. If it cannot be done before November 14, do not claim all three tracks or replace it with simulated governance. Do not ship a weakened two-track version.
