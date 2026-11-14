# Floorline DAO demonstration — complete

November 11, 2026. **Operator-controlled simulated council.** The real public-testnet DAO deployed and executed proposal 0. Three separate accounts and keys demonstrate distinct on-chain identities and real threshold governance; they do not establish independent human control.

## Council and deployment

- Council A (creator/proposer): floorline-council-a-20261111.testnet
- Council B (first approval): b.floorline-council-a-20261111.testnet
- Council C (second approval and execution trigger): c.floorline-council-a-20261111.testnet
- Project DAO: floorline-g3-20261111-6702ea.sputnikv2.testnet
- Factory: sputnikv2.testnet; code hash 77dkUJRCHKRxJxo6UtYgBtRP6hsEX2v4vXjmFuY7dktb. The factory is not a council member or the project DAO.
- DAO deployed code hash: AA4nA45vauiac3jdVwJTzSdUP3oj2r1fDaPAb2mHdgcH; version: "2.3.1". Factory default code metadata and pinned sources remain under testnet/evidence.
- Live policy: RoleWeight, council Group containing exactly these three accounts; quorum 0; ratio threshold [1,2]. The verified implementation computes floor(3/2)+1 = 2 approvals. Council permissions include AddProposal, VoteApprove, VoteReject, VoteRemove and Finalize. Everyone may AddProposal; this is not a permissioned proposal submission system.
- Proposal bond: 1 NEAR, period 604800000000000 ns (7 days). Complete policy/config are in testnet/evidence/dao-run.json and TESTNET_EVIDENCE.json under dao.

## Real threshold and execution

A submitted a FunctionCall proposal with contribute({}), attached 0.1 NEAR, gas 30 Tgas, receiver floor.floorline-g3-20261111-6702ea.testnet. Submission did not constitute a vote. B's separately signed approval left proposal 0 InProgress and L unchanged at 1.919 NEAR. C's separately signed approval reached two approvals and executed the real FunctionCall. Final proposal status is Approved.

The successful Floorline execution receipt is **4aMh8cSjwbvjCz8r3gfpw9jZmVzNDuJu7wLpvjNYKFiw**. Its action receipt, independently queried through EXPERIMENTAL_receipt, has the project DAO as predecessor and attaches exactly 100000000000000000000000 yoctoNEAR. Floorline emitted contribute with that DAO as donor, L=2019000000000000000000000 and T=1900000000000000000000000. All execution outcomes and the actual action receipts are retained.

## Before and after

- Backing L: **1.919 → 2.019 NEAR**.
- Supply T: **1.9 → 1.9 FLOOR**. No minting occurred.
- Pro-rata liquid backing per FLOOR: **1.01 → 2019/1900 = 1.062631578947368421… NEAR**. This ratio is not an unconditional minimum redemption payout; taxed redemption remains size dependent.
- Actual Floorline native balance: **8.169000000000000000000003 → 8.269000000000000000000003 NEAR**, exactly +0.1.
- Local required: **6.747910000000000000000003 → 6.847910000000000000000003 NEAR**. Actual balance exceeds required by 1.42109 NEAR.
- Protected storage credit remains 0.25 NEAR; operational reserve remains 4.578910000000000000000003 NEAR. Actual storage stake is 4.46338 NEAR, covered by the protected reserves. Outstanding claims, inflight payouts, unused lender principal and locked collateral remain zero.
- DAO native balance immediately before execution **7 NEAR**, afterwards **5.9 NEAR**. The 1.1 debit consists of the 0.1 contribution plus the 1 NEAR bond refund to A. Bond refund receipt **79iHBpFdYHNFgSd9bdT9JRStXTK3yG5YnE3RUVdskFw8** independently confirms the Transfer action. Do not misreport the whole 1.1 debit as a donation.

## Funding and key custody

One official helper grant funded the actual Council A account with 10 testnet NEAR. B and C were created and funded with 0.5 each from A; neither requested faucet funding. DAO creation attached 6 NEAR, and A posted the recoverable 1 NEAR bond. No faucet rejection/rate limit was bypassed and no alternate faucet accounts were created. Account availability was queried before creation. Funding transaction: Da8eQwKNiK2WwEqLM2FtZQVPHSBBjTWhMha5T86yqDrV. This is a separate DAO allocation from the previously completed core allocation. Final council/DAO funds total **9.869381109058408 NEAR**, contribution **0.1 NEAR**, execution fees/other net cost **0.030618890941592 NEAR**: together exactly 10 NEAR. Final council/DAO funds total **9.869381109058408 NEAR**, contribution **0.1 NEAR**, execution fees/other net cost **0.030618890941592 NEAR**: together exactly 10 NEAR. The final exact budget conservation is recorded under dao.budget in TESTNET_EVIDENCE.json. Gross initial allocation is 10 NEAR, within the 10 NEAR ceiling; transfers, returned bond, and actor gas are not double counted as additional funding.

Separate keys remain under E:\near-2\.testnet-credentials with the existing protected Windows ACL and repository exclusion. No private keys are included in reports. No Floorline code was modified or redeployed, no keys were deleted, and no frontend was started.

## Transaction evidence

- **create_b** — signer `floorline-council-a-20261111.testnet`, receiver `b.floorline-council-a-20261111.testnet`; [transaction data](https://api-testnet.nearblocks.io/v3/txns/MzrtcT5z4dyBnCLS1ikYc7JP1oftgX5pSS1T2ccoBTW), [explorer](https://testnet.nearblocks.io/txns/MzrtcT5z4dyBnCLS1ikYc7JP1oftgX5pSS1T2ccoBTW). Hash: `MzrtcT5z4dyBnCLS1ikYc7JP1oftgX5pSS1T2ccoBTW`.
- **create_c** — signer `floorline-council-a-20261111.testnet`, receiver `c.floorline-council-a-20261111.testnet`; [transaction data](https://api-testnet.nearblocks.io/v3/txns/HZfGZ4fQKyJD1tH7pdzi4harDTDWEaGjNxJEWmHHk5PF), [explorer](https://testnet.nearblocks.io/txns/HZfGZ4fQKyJD1tH7pdzi4harDTDWEaGjNxJEWmHHk5PF). Hash: `HZfGZ4fQKyJD1tH7pdzi4harDTDWEaGjNxJEWmHHk5PF`.
- **create_dao** — signer `floorline-council-a-20261111.testnet`, receiver `sputnikv2.testnet`; [transaction data](https://api-testnet.nearblocks.io/v3/txns/3K8rQt7EuZNd3asGJ9AgEW9yrmb1Brro94caq3dPR9gr), [explorer](https://testnet.nearblocks.io/txns/3K8rQt7EuZNd3asGJ9AgEW9yrmb1Brro94caq3dPR9gr). Hash: `3K8rQt7EuZNd3asGJ9AgEW9yrmb1Brro94caq3dPR9gr`.
- **add_proposal** — signer `floorline-council-a-20261111.testnet`, receiver `floorline-g3-20261111-6702ea.sputnikv2.testnet`; [transaction data](https://api-testnet.nearblocks.io/v3/txns/FfYNanc7b5JEzmhmpwk5vjn8p61fBbtgNnNMQPd1AwFo), [explorer](https://testnet.nearblocks.io/txns/FfYNanc7b5JEzmhmpwk5vjn8p61fBbtgNnNMQPd1AwFo). Hash: `FfYNanc7b5JEzmhmpwk5vjn8p61fBbtgNnNMQPd1AwFo`.
- **approve_B** — signer `b.floorline-council-a-20261111.testnet`, receiver `floorline-g3-20261111-6702ea.sputnikv2.testnet`; [transaction data](https://api-testnet.nearblocks.io/v3/txns/EMbAnPE9AmweA8NvN2hn5pYS5kFuTE1RcxMPVwBb4Nmz), [explorer](https://testnet.nearblocks.io/txns/EMbAnPE9AmweA8NvN2hn5pYS5kFuTE1RcxMPVwBb4Nmz). Hash: `EMbAnPE9AmweA8NvN2hn5pYS5kFuTE1RcxMPVwBb4Nmz`.
- **approve_C_execute** — signer `c.floorline-council-a-20261111.testnet`, receiver `floorline-g3-20261111-6702ea.sputnikv2.testnet`; [transaction data](https://api-testnet.nearblocks.io/v3/txns/hYYs7XFQATZyNF3DVE97dr7yVCdfJDFmjb5B3mRBicg), [explorer](https://testnet.nearblocks.io/txns/hYYs7XFQATZyNF3DVE97dr7yVCdfJDFmjb5B3mRBicg). Hash: `hYYs7XFQATZyNF3DVE97dr7yVCdfJDFmjb5B3mRBicg`.

NearBlocks v3 JSON data is checked independently for exact hash, signer and receiver. Canonical HTML explorer links are supplied, but the HTML routes previously returned 403 to the agent; no rendered-page verification is claimed. Each transaction's actual index verification result is stored alongside it.

## Proven and unproven

Proven: real Sputnik deployment; three distinct testnet identities; signed proposal and votes; one approval insufficient and two sufficient; actual DAO-to-Floorline contribution; liquid backing increase without minting; post-execution solvency and unchanged Floorline WASM.

Not proven: independent human governance, community decentralization, or participation by real external collaborators. All council keys are controlled by the local operator. This is a controlled multi-account integration test. Retained Floorline access keys also mean the deployment remains mutable; payable methods are publicly callable with no on-chain allowlist.

**Technical five-step public-testnet demonstration: COMPLETE.** Frontend remains unstarted by user instruction. This test does not replace an independent security audit or prove broader economic claims beyond the verified core invariants.
