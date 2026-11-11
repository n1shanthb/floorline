# Floorline demonstration readiness

**Public token/NFT core: ready as recorded evidence. Full five-step, three-track demonstration: NOT READY — independent DAO governance is paused.** These are real testnet transactions, not a simulation or a completed governance claim.

Contract: floor.floorline-g3-20261111-6702ea.testnet. Normal approved SHA-256: 529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6. Network must be testnet. Retained keys make this mutable. The deployment is unadvertised, but its methods are publicly callable; no allowlist exists.

## Account roles and funded starting balances

Controller/project operator: floorline-g3-20261111-6702ea.testnet, created with 10 faucet testnet NEAR. Its remaining finalized balance after the core run is 0.5520183820616849 NEAR.

- Contract: floor.floorline-g3-20261111-6702ea.testnet — funded with 6 NEAR for deployment/operations, not L.
- Alice: alice.floorline-g3-20261111-6702ea.testnet — 2.2 NEAR starting allocation; initial issuer and token distributor.
- Bob: bob.floorline-g3-20261111-6702ea.testnet — 0.2 NEAR including the recorded top-up; redeemer and permissionless default caller.
- Carol: carol.floorline-g3-20261111-6702ea.testnet — 0.2 NEAR including top-up; borrower and initial NFT owner.
- Dave: dave.floorline-g3-20261111-6702ea.testnet — 0.4 NEAR; receives the NFT and pays debt.
- Lender: lender.floorline-g3-20261111-6702ea.testnet — 0.4 NEAR; funds both offers externally and receives repayment/collateral.

These role accounts have separate keys but share project-operator control; they are not independent council members. Credentials are protected on E: and excluded from evidence. Never paste them into chat or a submission. No deployment access keys were deleted.

## Exact five-step evidence walkthrough

1. **Verify the protocol and real issuance.** Open [deployment/initialization data](https://api-testnet.nearblocks.io/v3/txns/6mFfa348aj5E6TcZQSRyK2VmTcJeNtikxKaPsaE4agBJ), verify approved code hash and the L=T=0 starting snapshot in TESTNET_EVIDENCE.json. Then inspect [Alice's issuance](https://api-testnet.nearblocks.io/v3/txns/6TfeGDTc5YyPPXtKb1QbBd2XFsUHB2Wsx3eaTFaX8cHy): 2 NEAR added to L, 2 FLOOR issued. Transfers give Bob 0.4 and Carol 0.5 FLOOR.

2. **Show redemption mechanics and solvency.** Inspect [Bob's redemption](https://api-testnet.nearblocks.io/v3/txns/2YHTdYdgBtFfKuHXP1TAn2R7bpZ5fwkAiJdGNp2qQMLZ) and [actual native payout](https://api-testnet.nearblocks.io/v3/txns/8MrXrQCVhyhv4dJcAyRoUM8BsMjSky9x6ooRpFmch23t). Burning 0.1 FLOOR pays 0.081 NEAR; backing changes from 2/2=1 to 1.919/1.9=1.01. Show the executed duplicate-withdrawal and dilutive-mint rejections from the evidence. This is a backing ratio, not a guaranteed redemption price.

3. **Show genuine NFT utility.** Inspect [the lender's separately funded offer](https://api-testnet.nearblocks.io/v3/txns/5uXjXAQyaXxtsK5jPFQsN6zcznFSLDQXK2oQz83AJi5V), Carol's acceptance/principal payout, [Carol->Dave NFT transfer](https://api-testnet.nearblocks.io/v3/txns/6kqBcUHPeT5TSFqjxLjq3AihsziHAWqUyVHjQFCmA9NV), and [Dave's repayment](https://api-testnet.nearblocks.io/v3/txns/5j1o8NzzTkNHHtjNuXGGRLHH9khwdZjURijicyps811M). The lender supplied 0.1 NEAR; debt was 0.11; collateral was 0.2 FLOOR. Carol's old-owner repayment failed. Dave got 0.2 FLOOR, the NFT terminated, and the lender withdrew its funded repayment. L/T did not change.

4. **Show actual expiry/default.** Inspect the distinct 0.05-NEAR loan and [real chain-time default](https://api-testnet.nearblocks.io/v3/txns/5FVQb4KG8eTubJd8p5FaFBoBfCqoRPefBcA3qHCm8jfD). The client waited for a 60-second term, then Bob defaulted it; lender gained 0.1 FLOOR, the NFT became null, and later repayment/double default were rejected. View the stored expiry and execution block timestamp in independent_final_verification. Final L=1.919, T=1.9, locked=0, in-flight=0, all four native payout claims Paid, A>=R_local.

5. **Independent-majority DAO contribution — BLOCKED, do not present as passed.** Obtain three actual public council IDs: project operator plus two independently controlled accounts, with their owners' participation confirmed. Create/verify a 2-of-3 project DAO, submit the prepared actual-account FunctionCall payload, obtain real votes, execute 0.1 NEAR, verify terminal receipt and DAO debit, and show L=2.019 with T=1.9 **only if that transaction actually happens**. There is currently no project DAO, proposal ID, vote or DAO contribution hash.

## Manual steps and replay boundaries

The links above show already executed transactions. Do not run the signing client just to replay evidence; it now refuses to repeat a completed run. Use `runtime/gate3-final-verify.mjs` for read-only finalized checks and TESTNET_EVIDENCE.json for historical before/after state. That script reads public RPC data and does not load keys.

The immutable issuance weight is now below the increased backing price, so attempting to re-run initial issuance is supposed to fail the nondilution check. Existing loan IDs are terminal and existing paid claims must not be reused. A fresh live repetition would need new funded offers, current quotes/balances, prepaid storage and real expiry, within the already authorized budget; do not fabricate another initial state or change economics to make replay easier.

All figures use 24-decimal atomic units. For any additional actual calls, use runtime-derived quotes and native balances; ordinary calls used 25 Tgas, withdrawals require at least 110 Tgas. Account for upfront gas reservation, which can exceed consumed-gas cost. Keep existing evidence immutable as a record; append new real transactions instead of replacing their hashes.

Before the DAO step, reverify factory code/default version/deposit and actual policy. The reported default source suggests at least 5.39679 NEAR for legacy code storage, with 6 NEAR as a candidate creation budget within the 10-NEAR ceiling; this is not a live creation receipt. Current operator funds do not cover creation plus the 1-NEAR proposal bond. Obtain legitimate testnet funding and confirm budget before spending. Do not generate both independent council keys locally or use unrelated public accounts as members. Never ask owners to share private keys.

Canonical NearBlocks HTML links are present in the evidence but returned HTTP 403 to the agent. The links here use the current v3 transaction-data API; all 35 finalized transaction hashes/signers/receivers were independently matched there. Old v1/v2 endpoints are retired. HTML rendering remains unverified and is not conflated with indexed transaction-data verification. Finalized RPC outcomes are the authoritative chain evidence.

## Known limitations

No frontend, mainnet funds, outside deposit solicitation, audit, ownerless claim, on-chain allowlist or completed independent governance. Unknown callbacks remain locked; exact nanosecond expiry equality and failed storage-refund retry retain the Gate 2 verification limits. The protocol does not guarantee market price, USD value, positive dust payouts or lender recovery in NEAR. If genuine independent governance cannot be demonstrated before the deadline, the full three-track demo is not ready; do not silently submit a two-track fallback.
