# Floorline

**NEAR-backed FLOOR reserve + NFT-collateralized lending — verified on public NEAR testnet.**

Floorline lets users issue and redeem a NEAR-backed FLOOR token, then borrow against FLOOR using **lender-funded** offers. The transferable recovery/repayment right is a **NEP-171 NFT**. The RC1 acceptance contract finished a **40/40 FINAL_VERIFIED** public-testnet run and is **permanently stopped for new-risk actions**.

| | |
| --- | --- |
| **Live demo** | https://floorline-delta.vercel.app |
| **Proof explorer** | https://floorline-delta.vercel.app/verify |
| **Judge quickstart** | https://floorline-delta.vercel.app/judges |
| **RC1 contract** | [`rc1.floorline-g3-20261111-6702ea.testnet`](https://testnet.nearblocks.io/address/rc1.floorline-g3-20261111-6702ea.testnet) |
| **Code hash** | `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az` |
| **Acceptance** | **40/40 FINAL_VERIFIED** · `ACCEPTANCE_COMPLETE_BROWSER_UI_EVIDENCE_VERIFIED` |
| **Network** | **NEAR TESTNET ONLY** — Floorline is **not** mainnet-deployed |
| **Selected tracks** | **Unstoppable DeFi** · **NFTs That Do Something** · **AI Security & Defense** |
| **Demo video** | [docs/demo/video/](docs/demo/video/) (narrated proof walkthrough for X) |

### 60-second judge path

1. Open [/verify](https://floorline-delta.vercel.app/verify) — confirm 40/40 and **NEW RISK STOPPED**.
2. Open the [RC1 account](https://testnet.nearblocks.io/address/rc1.floorline-g3-20261111-6702ea.testnet) — code hash matches above.
3. Check [stop](https://testnet.nearblocks.io/txns/65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3) then [unregister](https://testnet.nearblocks.io/txns/2oKARd2oGXcS8s5y1Xrqv7b5KP3CawWBjEBwPnRf6bHE).
4. Clone and run: `cd frontend && npm ci && npm run judge:verify`

### Also submitted by the same solo developer

**[NEAR Intent One](https://github.com/n1shanthb/near-intent-one)** — separate autonomous DeFi / agent project with NEAR mainnet Intents evidence. Independent codebase. Not Floorline transactions.

- Demo: https://near-intent-one.vercel.app  
- Verify: https://near-intent-one.vercel.app/verify  
- Proofs: https://github.com/n1shanthb/near-intent-one/blob/master/docs/PROOF_INDEX.md  

---

## Why Floorline fits three NEAR Hackathon tracks

Floorline is entered under **Unstoppable DeFi**, **NFTs That Do Something**, and **AI Security & Defense**. Each track maps to shipped, receipt-backed behavior on **NEAR testnet** — not a slide deck.

### Unstoppable DeFi

Floorline is native NEAR DeFi: a NEP-141 FLOOR reserve plus **lender-funded** borrowing against FLOOR collateral. Issuance and redemption move liquid NEAR backing `L` and supply `T` under programmed rules; a configured **20%** redemption tax (`tax_bps = 2000`) applies on the demonstrated curve. **`L/T` is an accounting ratio, not a market-price or redemption-price guarantee.**

Financial state is public and reproducible: 40/40 acceptance receipts, live contract views, and the [/verify](https://floorline-delta.vercel.app/verify) catalog. Demonstrated paths include issuance/redemption, repayment, and default settlement. The RC1 contract is **permanently stopped for new-risk**; it is a completed testnet demonstration, not a live market.

Floorline does **not** integrate NEAR Intents or cross-chain settlement. That belongs to the separate [NEAR Intent One](https://github.com/n1shanthb/near-intent-one) submission.

Evidence:

- Redemption claim withdraw: [`EyiBXwpRXnkJmxYCmYT58UpKZzpw57BYs3dkJ6n67ZbA`](https://testnet.nearblocks.io/txns/EyiBXwpRXnkJmxYCmYT58UpKZzpw57BYs3dkJ6n67ZbA)
- NFT-holder repayment: [`CzkQir6usnSAkph3ksZvjBLTrZfDLERnCCKPNDfWEHGB`](https://testnet.nearblocks.io/txns/CzkQir6usnSAkph3ksZvjBLTrZfDLERnCCKPNDfWEHGB)
- Default / collateral release: [`GFvtYszDR36rPXsKeR6udwuJgHoDe1feRTKXBTMDkh3B`](https://testnet.nearblocks.io/txns/GFvtYszDR36rPXsKeR6udwuJgHoDe1feRTKXBTMDkh3B)

### NFTs That Do Something

Loan recovery and repayment rights are represented by a **NEP-171 NFT**. Ownership is functional: the current NFT holder may repay under contract rules and recover locked FLOOR collateral. The original borrower does not retain that right after transfer. This is a transferable financial entitlement, not a collectible badge or artwork.

RC1 demonstrated a real transfer followed by repayment by the new holder:

- NFT transfer: [`GKuJWQRG7UXPy6SwtboqapKEsYwpAJbDrhUmXJnMMBmz`](https://testnet.nearblocks.io/txns/GKuJWQRG7UXPy6SwtboqapKEsYwpAJbDrhUmXJnMMBmz)
- Repayment by NFT rights holder: [`CzkQir6usnSAkph3ksZvjBLTrZfDLERnCCKPNDfWEHGB`](https://testnet.nearblocks.io/txns/CzkQir6usnSAkph3ksZvjBLTrZfDLERnCCKPNDfWEHGB)

### AI Security & Defense

Floorline does **not** implement a dedicated AI-agent wallet or agent spending-policy engine. The track fit is **bounded financial-protocol safety** that AI judge agents can verify from public receipts:

- Pilot exposure caps and a **128-slot** admission / storage accounting gate
- Callback gas preflight and quarantine of unknown async results (no automatic duplicate payout retries)
- Guardian **irreversible new-risk stop** after demonstration
- Funded exit still verified **after** stop (storage unregister)
- Open [/verify](https://floorline-delta.vercel.app/verify) catalog plus Claude Code / Codex **read-only** judge prompts

Safety receipts:

- Stop: [`65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3`](https://testnet.nearblocks.io/txns/65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3)
- Post-stop unregister: [`2oKARd2oGXcS8s5y1Xrqv7b5KP3CawWBjEBwPnRf6bHE`](https://testnet.nearblocks.io/txns/2oKARd2oGXcS8s5y1Xrqv7b5KP3CawWBjEBwPnRf6bHE)

---

## How Floorline helps the NEAR ecosystem

**Demonstrated on public testnet (what exists today):**

1. **Better lending primitives** — Lender-funded NEAR credit with on-chain, transferable repayment/recovery rights, separate from treasury backing.
2. **Functional NFTs** — NEP-171 tokens that change what the holder is allowed to do (repay / recover), not metadata-only collectibles.
3. **Transparent reserve accounting** — NEP-141 FLOOR with separately tracked NEAR liquid backing `L`, supply `T`, claims, and storage; `L/T` labeled as accounting, not price.
4. **Safer async money flows** — Claim/withdraw exits, callback protections, unknown-result quarantine, and admission/storage accounting exercised across multi-receipt transactions.
5. **Governance compatibility (limited)** — A historical Sputnik DAO contribution demo shows a route for DAO FunctionCalls; it was **operator-controlled** and does **not** prove independent community governance.
6. **Developer reproducibility** — Open Rust contract (`near-sdk 5.30.1`), 40-step receipt catalog, `npm run judge:verify`, public Vercel demo, and AI-readable judge prompts.

**Potential adoption (not claimed as shipped):**

Future builders could adapt these patterns for lending markets or credit products **after** their own audits, custody design, upgrades, and economic validation. Floorline itself is a **testnet** demonstration with **no** independent audit, **no** Floorline mainnet financial deployment, and **no** claim of production users.

---

## 1. Problem and product

DeFi “backed” tokens often hide whether reserves, claims, and lending risk are actually separable. Floorline makes the mechanics explicit:

- FLOOR issuance/redemption against liquid NEAR backing `L` and supply `T`
- Lender-funded borrowing (treasury is **not** the lender)
- NFT ownership as the repayment/recovery right
- Irreversible guardian stop for new risk after demonstration

## 2–3. FLOOR reserve, issuance, redemption, 20% tax

- Issuance mints FLOOR when attached NEAR increases backing under pilot limits.
- Redemption burns FLOOR and creates a **native claim** withdrawn separately.
- `tax_bps = 2000` (20%) retains value for remaining holders on the demonstrated curve.
- **`L/T` is an accounting ratio, not a guaranteed executable market or redemption price.**

## 4–7. Lending, NFT rights, lifecycle, governance

- Lenders fund offers; borrowers lock FLOOR collateral and receive principal via claims.
- The loan NFT can transfer; the current NFT owner holds repayment rights under contract rules.
- Paths demonstrated on RC1: repayment, default/collateral release, offer cancel.
- Historical Gate-3 used a **Sputnik DAO** FunctionCall contribution demo (operator-controlled council). Independent multi-human governance is **not** claimed as proven.

## 8. Deployment identities (testnet)

| Role | Account |
| --- | --- |
| RC1 contract | `rc1.floorline-g3-20261111-6702ea.testnet` |
| Guardian / controller | `floorline-g3-20261111-6702ea.testnet` |
| Historical v1 (archived) | `floor.floorline-g3-20261111-6702ea.testnet` |

## 9. RC1 40-step verified execution

Recorded final state (acceptance journal + live views agree when RPC is available):

- Liquid backing **L**: 0.01018 NEAR  
- FLOOR supply **T**: 0.009 FLOOR  
- Claims / inflight: **0**  
- Storage total: **0.060 NEAR**  
- Admission: **3/128**  
- **stopped: true**

Final three transactions:

| Step | Hash |
| --- | --- |
| Storage withdraw | [`JDWdcjQbBBvj6SMzh1abvujHduSdo9nD14ihPPLxnKhL`](https://testnet.nearblocks.io/txns/JDWdcjQbBBvj6SMzh1abvujHduSdo9nD14ihPPLxnKhL) |
| Irreversible stop | [`65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3`](https://testnet.nearblocks.io/txns/65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3) |
| Post-stop unregister | [`2oKARd2oGXcS8s5y1Xrqv7b5KP3CawWBjEBwPnRf6bHE`](https://testnet.nearblocks.io/txns/2oKARd2oGXcS8s5y1Xrqv7b5KP3CawWBjEBwPnRf6bHE) |

Full catalog: [docs/PROOF_INDEX.md](docs/PROOF_INDEX.md) · [docs/evidence/proofs.json](docs/evidence/proofs.json)

**Gas amendments (evidence-only):** `collateral_to_borrower` and `contribute` finalized at **30 Tgas** vs planned 110 Tgas. Amounts/args unchanged.

**Do not attempt issuance on stopped RC1.** Read-only browsing needs no wallet.

## 10. Proof / verify

- UI: https://floorline-delta.vercel.app/verify  
- Explorer base: https://testnet.nearblocks.io/txns/  
- Methodology: dual-provider FINAL + root and **all descendant** receipts SuccessValue/SuccessReceiptId

## 11–12. Clone, test, build

```bash
git clone https://github.com/n1shanthb/floorline.git
cd floorline/frontend
npm ci
npm run typecheck
npm test
npm run build
npm run judge:verify
```

Windows PowerShell is supported the same way from `frontend/`.

Judge modes:

```bash
npm run judge:verify
npm run judge:verify -- --offline
npm run judge:verify -- --live
```

No private keys, faucets, or wallet signing are required for judges.

Frontend routes that exist today: `/`, `/verify`, `/judges`, `/app`, `/app/treasury`, `/app/loans`, `/app/governance`, `/app/activity`.

## 13. AI judge prompts

| Agent | Prompt |
| --- | --- |
| Claude Code | [docs/judges/CLAUDE_CODE_PROMPT.md](docs/judges/CLAUDE_CODE_PROMPT.md) |
| Codex | [docs/judges/CODEX_PROMPT.md](docs/judges/CODEX_PROMPT.md) |
| Shared runbook | [docs/judges/JUDGE_RUNBOOK.md](docs/judges/JUDGE_RUNBOOK.md) |

## 14. Security model and limitations

- Testnet demonstration with pilot caps; **not** an independent audit.
- Guardian can stop new risk; stop is irreversible on this contract.
- No guaranteed price, yield, or fixed executable redemption floor.
- Public RPC may rate-limit; treat 408/429 as transport issues, not rewritten history.
- Wallet connect is optional for browsing; never paste seeds/keys into the app.

## 15. Historical v1 vs RC1

| | Historical v1 | RC1 |
| --- | --- | --- |
| Account | `floor.floorline-g3-…` | `rc1.floorline-g3-…` |
| Role | Earlier Gate-3 demo / UI evidence | Authoritative 40/40 acceptance |
| Status | Archived labels in UI | Stopped for new risk |

## 16. Evidence index

- [docs/PROOF_INDEX.md](docs/PROOF_INDEX.md)
- [docs/evidence/proofs.json](docs/evidence/proofs.json)
- Journal (engineering): `mainnet-release/async-hardening/release/acceptance-preparation-20261114/ACCEPTANCE_EXECUTION.json`

## 17. Separate NIO submission

Disclosed under NEAR HACKATHON Q-015 (one person, up to two independent projects). See links at top.

## 18. Author, license, submission

- Author: Nishanth (solo)
- Repository: https://github.com/n1shanthb/floorline
- Submission materials: [docs/submission/](docs/submission/)
- Rules checklist: [docs/submission/RULES_CHECKLIST.md](docs/submission/RULES_CHECKLIST.md)

### Historical archive (not the RC1 headline)

Earlier Gate / research docs remain in-repo for lineage (e.g. `GATE2_RESULTS.md`, `GATE3_RESULTS.md`, `DAO_DEMONSTRATION.md`, `FRONTEND_IMPLEMENTATION_REPORT.md`). Prefer RC1 proofs above for judging.
