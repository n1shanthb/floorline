# Floorline Proof Index

**Project:** Floorline  
**Network:** NEAR Testnet  
**Contract:** `rc1.floorline-g3-20261111-6702ea.testnet`  
**Status:** 40/40 FINAL_VERIFIED  

All transactions below are finalized on NEAR testnet with dual-provider verification. Each entry includes NearBlocks explorer link and local evidence path.

---

## Summary

- **Total Proofs:** 40
- **Network:** testnet
- **Contract Code Hash:** `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`
- **Final State Block:** 277696567
- **Acceptance Status:** ACCEPTANCE_COMPLETE_BROWSER_UI_EVIDENCE_VERIFIED
- **Final L/T:** 10.18 NEAR / 9.0 FLOOR
- **Stopped:** true

---

## Proofs by Group

### 1. Deployment (5 transactions)

#### rc1-01: Deploy
- **Title:** Fresh RC1 atomic deployment
- **Method:** Deploy contract
- **Hash:** [3Gf1RnQWWy...](https://testnet.nearblocks.io/txns/3Gf1RnQWWyXx6a7CyqDS4BYiWMosTdaiSfSuNbgcJG9c)
- **Signer:** floorline-g3-20261111-6702ea.testnet
- **Status:** ✅ FINAL_VERIFIED
- **Evidence:** `ACCEPTANCE_EXECUTION.json#rows[0]`

#### rc1-02: Fund Holder
- **Title:** Fund holder actor (Alice)
- **Method:** Transfer
- **Hash:** [FYi2rYm28n...](https://testnet.nearblocks.io/txns/FYi2rYm28nh49QLrktqw4L3ijo7w8R3UZqNSZCV1xoj9)
- **Deposit:** 1.94 NEAR
- **Status:** ✅ FINAL_VERIFIED
- **Evidence:** `ACCEPTANCE_EXECUTION.json#rows[1]`

#### rc1-03: Fund Borrower
- **Title:** Fund borrower actor (Carol)
- **Method:** Transfer
- **Hash:** [J8uzrmrdhf...](https://testnet.nearblocks.io/txns/J8uzrmrdXh7hRiQBiseMeVV8fAagq5SzYmWqb6qTUCEn)
- **Deposit:** 1.21 NEAR
- **Status:** ✅ FINAL_VERIFIED
- **Evidence:** `ACCEPTANCE_EXECUTION.json#rows[2]`

#### rc1-04: Fund NFT Holder
- **Title:** Fund NFT-holder actor (Dave)
- **Method:** Transfer
- **Hash:** [9QeAqcsTTq...](https://testnet.nearblocks.io/txns/9QeAqcsTTqnLpqpRZuijBU38sSmm5av71na8ydkyuFMe)
- **Deposit:** 0.37 NEAR
- **Status:** ✅ FINAL_VERIFIED
- **Evidence:** `ACCEPTANCE_EXECUTION.json#rows[3]`

#### rc1-05: Fund Lender
- **Title:** Fund lender actor
- **Method:** Transfer
- **Hash:** [BtuWTZMFRc...](https://testnet.nearblocks.io/txns/BtuWTZMFRChEtiMaqtc4ABTC7vmps1T1CQBjbd7rRysF)
- **Deposit:** 0.97 NEAR
- **Status:** ✅ FINAL_VERIFIED
- **Evidence:** `ACCEPTANCE_EXECUTION.json#rows[4]`

---

### 2. Storage Registration (5 transactions)

All actors register storage (NEP-145) with 0.02 NEAR deposits.

#### rc1-06: Register Holder
- **Hash:** [EzJHtMiZoy...](https://testnet.nearblocks.io/txns/EzJHtMiZoyrBmEJTdfKGLgwPoh73DS6mo83ack6rTswJ)
- **Block:** 277608981
- **Before/After State:** storage_total 0 → 0.02 NEAR, admission 0 → 1

#### rc1-07: Register Borrower
- **Hash:** [Ad2WphneJH...](https://testnet.nearblocks.io/txns/Ad2WphneJHcSqYrR3kbZhzr7uQuc7WM4v849fnqCG9U)
- **Block:** 277609094
- **Before/After State:** admission 1 → 2

#### rc1-08: Register NFT Holder
- **Hash:** [Df26ChGeMj...](https://testnet.nearblocks.io/txns/Df26ChGeMjCnw4TgTssBCRa6rYX1iVN5vACsyp2EcGAN)
- **Block:** 277609211
- **Before/After State:** admission 2 → 3

#### rc1-09: Register Lender
- **Hash:** [38yG1tnUgk...](https://testnet.nearblocks.io/txns/38yG1tnUgk2Gu3XS8buwXr1mWuzs49zehZ23EV54uBh7)
- **Block:** 277609328
- **Before/After State:** admission 3 → 4

#### rc1-10: Register Wallet Holder
- **Title:** Register Funmask wallet holder
- **Hash:** [SwTUrnrWmt...](https://testnet.nearblocks.io/txns/SwTUrnrWmt7TrJdRExCndek5ndxXFsDNBypXGWgy6Cy)
- **Browser:** ✅ Browser wallet transaction
- **Status:** ✅ FINAL_VERIFIED

---

### 3. FLOOR Lifecycle (6 transactions)

#### rc1-11: Issue FLOOR
- **Title:** FLOOR issuance from browser wallet
- **Hash:** [63AaM37eN4...](https://testnet.nearblocks.io/txns/63AaM37eN455GB8JinN6oUYDjzuZaMcEfcGG3ZwxcdVm)
- **Deposit:** 10 NEAR
- **Min Tokens:** 10 FLOOR
- **Browser:** ✅ Wallet transaction
- **Status:** ✅ FINAL_VERIFIED

#### rc1-12: Transfer to Borrower
- **Title:** FLOOR transfer to borrower (NEP-141)
- **Hash:** [8m2bHVobQs...](https://testnet.nearblocks.io/txns/8m2bHVobQsSpJjRzmuyQaQHiq7x3i1iCsqSJ2cYZxAiK)
- **Amount:** 3 FLOOR
- **Block:** 277661710
- **Gas Amendment:** 30 Tgas finalized (110 Tgas planned)
- **Browser:** ✅ Wallet transaction

#### rc1-13: Redeem FLOOR
- **Title:** FLOOR redemption to claim
- **Hash:** [4gj1BQFmB9...](https://testnet.nearblocks.io/txns/4gj1BQFmB9wH2NqtZRnTBfdQErdbUDCAQULRTPqojYyd)
- **Amount:** 1 FLOOR
- **Min Out:** 0.82 NEAR
- **Block:** 277666318
- **Browser:** ✅ Wallet transaction

#### rc1-14: Withdraw Redemption
- **Title:** Native redemption claim withdrawal
- **Hash:** [EyiBXwpRXn...](https://testnet.nearblocks.io/txns/EyiBXwpRXnkJmxYCmYT58UpKZzpw57BYs3dkJ6n67ZbA)
- **Claim ID:** 1
- **Block:** 277670650
- **Receipt Count:** 7 (async claim pattern)
- **Browser:** ✅ Wallet transaction

#### rc1-15: Cleanup Redeem
- **Title:** Redemption claim cleanup
- **Hash:** [F3kutexpi1...](https://testnet.nearblocks.io/txns/F3kutexpi1YY3RMYRadBoYLKbF2xxro3pMPPiX6jbtwV)
- **Block:** 277671120

#### rc1-36: Contribute Backing
- **Title:** External contribution (backing only, no issuance)
- **Hash:** [AhQWF5zGbW...](https://testnet.nearblocks.io/txns/AhQWF5zGbWoQ4VzhXMs5uenTXZQaJ6UpnntHuhH8ZUW1)
- **Deposit:** 1 NEAR
- **Block:** 277690778
- **Gas Amendment:** 30 Tgas finalized (110 Tgas planned)
- **Browser:** ✅ Wallet transaction

---

### 4. Lending (Repayment Path) — 9 transactions

Full lifecycle: lender funds offer → borrower accepts → NFT transfer → repayment → cleanup.

#### rc1-16: Offer (Repay)
- **Hash:** [5o8nT2YxNe...](https://testnet.nearblocks.io/txns/5o8nT2YxNe3XJNHkkq2eRSuSd6pBVcWP8LDQMrd6YkVm)
- **Repayment:** 2.2 NEAR | **Collateral:** 1 FLOOR | **Duration:** 1 day
- **Block:** 277671582

#### rc1-17: Borrow (Repay)
- **Hash:** [FhY98dpwD3...](https://testnet.nearblocks.io/txns/FhY98dpwD3FKj5JbY82FvcXEE5hfgN9G2SqeUnxNpLJD)
- **Loan ID:** 3
- **Block:** 277672036

#### rc1-18: Withdraw Principal
- **Hash:** [EbxKcJ51Cb...](https://testnet.nearblocks.io/txns/EbxKcJ51CbBtqBxn4PWcMmf2Mf7A2oRY9dpMn9waeV3U)
- **Claim ID:** 4
- **Block:** 277672219
- **Receipt Count:** 7

#### rc1-19: Cleanup Borrow (Repay)
- **Hash:** [7DVCz1zH2H...](https://testnet.nearblocks.io/txns/7DVCz1zH2HTp8JdRoibBmyFXdM7Q5JoY1cUbniQJ3U1t)
- **Block:** 277675031

#### rc1-20: NFT Transfer
- **Title:** NEP-171 NFT ownership transfer (loan receipt to Dave)
- **Hash:** [GKuJWQRG7U...](https://testnet.nearblocks.io/txns/GKuJWQRG7UXPy6SwtboqapKEsYwpAJbDrhUmXJnMMBmz)
- **Token ID:** 3
- **Block:** 277675860
- **Demonstrates:** Third-party can hold NFT and repay

#### rc1-21: Repay
- **Title:** NFT-holder repayment (Dave pays, not Carol)
- **Hash:** [CzkQir6usn...](https://testnet.nearblocks.io/txns/CzkQir6usnSAkph3ksZvjBLTrZfDLERnCCKPNDfWEHGB)
- **Deposit:** 2.2 NEAR
- **Block:** 277676727

#### rc1-22: Withdraw Repayment
- **Hash:** [7Ku8DTbiAM...](https://testnet.nearblocks.io/txns/7Ku8DTbiAMoTze144iCisTBiJkDNJwhwfd5TaCbV2rzm)
- **Claim ID:** 6
- **Block:** 277677576
- **Receipt Count:** 7

#### rc1-23: Cleanup Repay
- **Hash:** [HgeuhqJwD6...](https://testnet.nearblocks.io/txns/HgeuhqJwD6pLDVTkoVUtonMRU6aZghFPUxJYTodPW7Kn)
- **Block:** 277678412

#### rc1-24: Cleanup Offer (Repay)
- **Hash:** [DpXg5y12Xs...](https://testnet.nearblocks.io/txns/DpXg5y12XsKASJtrchcig5YzVpNWwkUNZ9KFdu65Nrg1)
- **Block:** 277679231

---

### 5. Lending (Default Path) — 7 transactions

Full lifecycle: lender funds short offer → borrower accepts → deadline passes → lender defaults → seize collateral.

#### rc1-25: Offer (Default)
- **Hash:** [EfrgkbMgKT...](https://testnet.nearblocks.io/txns/EfrgkbMgKTWFvY2gLSE7RqASKgqvernDmPJMP4kb9CfG)
- **Duration:** 120 seconds (intentionally short for testnet)
- **Block:** 277680088

#### rc1-26: Borrow (Default)
- **Hash:** [AK14sn8SGa...](https://testnet.nearblocks.io/txns/AK14sn8SGamoTHvo3hUdqfhjEieFUa7n1xxK9khYUwpu)
- **Loan ID:** 8
- **Block:** 277680916

#### rc1-27: Withdraw Default Principal
- **Hash:** [AnRHtfjzt3...](https://testnet.nearblocks.io/txns/AnRHtfjzt3iHKtz44MDTvaNwWLQURk8kvmE5XSYmg76n)
- **Block:** 277681740

#### rc1-28: Cleanup Borrow (Default)
- **Hash:** [E3PE1qPTDc...](https://testnet.nearblocks.io/txns/E3PE1qPTDcNgzsphcCh6Bg8yigPR822FXC76pzR32FKs)
- **Block:** 277682581

#### rc1-29: Default Loan
- **Title:** Default transition / collateral release to lender
- **Hash:** [GFvtYszDR3...](https://testnet.nearblocks.io/txns/GFvtYszDR36rPXsKeR6udwuJgHoDe1feRTKXBTMDkh3B)
- **Block:** 277683435

#### rc1-30: Cleanup Offer (Default)
- **Hash:** [7G8RQVsybp...](https://testnet.nearblocks.io/txns/7G8RQVsybpQmn4P2YWoMNeXgk4URGRKKs9KxCB9JfgHJ)
- **Block:** 277684253

#### rc1-37: Return Free Tokens
- **Title:** Return free FLOOR tokens (closing Carol's collateral position)
- **Hash:** [D7jJDKkRip...](https://testnet.nearblocks.io/txns/D7jJDKkRipujwi4xjCp1U8KcCFnkQsveduSPb42q6cgB)
- **Amount:** 1 FLOOR
- **Block:** 277692088

---

### 6. Cancellation Path — 5 transactions

Lender cancels offer before acceptance.

#### rc1-31: Offer (Cancel)
- **Hash:** [8SqHYjJ98S...](https://testnet.nearblocks.io/txns/8SqHYjJ98SdrUFF4xc64rdmmwqifrg6o2CZyTSsaoz9N)
- **Block:** 277685075

#### rc1-32: Cancel Offer
- **Hash:** [CswGb1eQgt...](https://testnet.nearblocks.io/txns/CswGb1eQgt8HHyWFKSmogHDu8ycj49nVPbMfcaR9cqac)
- **Loan ID:** 11
- **Block:** 277685916

#### rc1-33: Withdraw Cancel
- **Hash:** [6oRi88caNa...](https://testnet.nearblocks.io/txns/6oRi88caNa1tBBBb6xhvM7P2DrgxVF3WYPi57rywjm8A)
- **Claim ID:** 12
- **Block:** 277686737
- **Receipt Count:** 7

#### rc1-34: Cleanup Cancel
- **Hash:** [a1gqKUUz9S...](https://testnet.nearblocks.io/txns/a1gqKUUz9SkTJBqcoWHiDpXLis2EhCndnuWdGxSYXnP)
- **Block:** 277687553

#### rc1-35: Cleanup Offer (Cancel)
- **Hash:** [G98mFJpPdt...](https://testnet.nearblocks.io/txns/G98mFJpPdtcUcKB2z8kmtf9GUcAtUMqg1vbLcbauZnqg)
- **Block:** 277688382

---

### 7. Storage & Stop — 3 transactions

#### rc1-38: Withdraw Storage
- **Title:** Storage withdrawal (NEP-145 partial unregister)
- **Hash:** [JDWdcjQbBB...](https://testnet.nearblocks.io/txns/JDWdcjQbBBvj6SMzh1abvujHduSdo9nD14ihPPLxnKhL)
- **Amount:** 0.001 NEAR
- **Block:** 277692948
- **Before/After:** storage_total 0.08 → 0.079 NEAR

#### rc1-39: Stop Contract
- **Title:** Irreversible new-risk stop
- **Hash:** [65mFsU6oiA...](https://testnet.nearblocks.io/txns/65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3)
- **Block:** 277695340
- **Before/After:** stopped false → true
- **Critical:** No new issuance/loans after this

#### rc1-40: Post-Stop Unregister
- **Title:** Post-stop funded storage unregister
- **Hash:** [2oKARd2oGX...](https://testnet.nearblocks.io/txns/2oKARd2oGXcS8s5y1Xrqv7b5KP3CawWBjEBwPnRf6bHE)
- **Block:** 277696215
- **Before/After:** admission 4 → 3, storage_total 0.079 → 0.06 NEAR
- **Demonstrates:** Funded exits work post-stop

---

## Gas Amendments (Evidence-Only)

Two transactions finalized at 30 Tgas instead of planned 110 Tgas. Amounts and arguments unchanged — evidence recorded at actual execution gas.

1. **rc1-12 (collateral_to_borrower):**  
   Planned 110 Tgas, finalized 30 Tgas  
   Hash: `8m2bHVobQsSpJjRzmuyQaQHiq7x3i1iCsqSJ2cYZxAiK`

2. **rc1-36 (contribute):**  
   Planned 110 Tgas, finalized 30 Tgas  
   Hash: `AhQWF5zGbWoQ4VzhXMs5uenTXZQaJ6UpnntHuhH8ZUW1`

---

## Browser Wallet Transactions

5 transactions executed from browser wallet (Funmask testnet wallet):

- **rc1-10:** Register storage
- **rc1-11:** Issue FLOOR
- **rc1-12:** Transfer FLOOR
- **rc1-13:** Redeem FLOOR
- **rc1-14:** Withdraw redemption claim
- **rc1-36:** Contribute backing

---

## Verification Commands

### Quick Check (All 40)
```bash
cd frontend
npm ci
npm run judge:verify
```

### Manual RPC Query
```bash
near view rc1.floorline-g3-20261111-6702ea.testnet get_state
```

### Browse Evidence
Open [`docs/evidence/proofs.json`](../evidence/proofs.json) or [`frontend/public/evidence/proofs.json`](../frontend/public/evidence/proofs.json) — identical files.

---

## Related Submission

**Near Intent One (NIO)** — disclosed separate solo project:
- Repo: https://github.com/n1shanthb/near-intent-one
- Demo: https://near-intent-one.vercel.app
- Independence: Different domain (intents vs lending), no shared contracts

---

**Last Updated:** 2026-11-14  
**All 40 proofs FINAL_VERIFIED with receipt closures**
