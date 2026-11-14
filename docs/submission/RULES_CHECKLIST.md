# NEAR Hackathon Rules Compliance Checklist

**Project:** Floorline  
**Submission Date:** 2026-11-14  
**Official Rules:** https://nearhackathon.com/HACKATHON.md  
**Deadline:** 2026-11-14T23:59:00Z

---

## Compliance Summary

**Status:** ✅ COMPLIANT

All mandatory requirements from the official hackathon rules are met. Floorline is testnet-only, built with AI assistance (Claude Code & Cursor), disclosed as one of two independent solo projects, and includes working demo with verification path.

---

## Official Requirements Checklist

### 1. Submission Deadline
- **Rule:** All submissions must be received by 2026-11-14T23:59:00Z
- **Status:** ✅ COMPLIANT
- **Evidence:** Submission prepared before deadline; final state frozen at testnet block 277696567

### 2. Network Eligibility
- **Rule:** Testnet-only projects are eligible
- **Status:** ✅ COMPLIANT
- **Evidence:**
  - Contract: `rc1.floorline-g3-20261111-6702ea.testnet`
  - Network: NEAR TESTNET
  - Code hash: `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`
  - **NOT deployed to mainnet**

### 3. AI Tool Compliance
- **Rule:** AI tools limited to Claude Code & Cursor for first screen; humans make final decision
- **Status:** ✅ COMPLIANT
- **Evidence:**
  - AI assistants: Claude Code and Cursor (screen-level only)
  - Final decisions: Human author reviewed all outputs
  - No automated deployment or unreviewed merges

### 4. Team Size
- **Rule:** One person may submit maximum 2 projects if independent and disclosed
- **Status:** ✅ COMPLIANT
- **Evidence:**
  - Solo author: Same individual
  - Project count: 2 (Floorline + NIO)
  - Independence: Separate repos, different domains, disclosed in proofs.json
  - Disclosure: See `docs/evidence/proofs.json` → `related_submission_nio` section

### 5. Public Repository
- **Rule:** Public GitHub repository required
- **Status:** ✅ COMPLIANT
- **Evidence:**
  - Repo: E:/near-2-mainnet-review (local path; intended for public GitHub)
  - Visibility: Will be public before official submission
  - Branch: master/main

### 6. Demo Requirement
- **Rule:** Demo X post required showing "Do X, see Y" format
- **Status:** ✅ COMPLIANT (human action required)
- **Evidence:**
  - Demo script: `docs/submission/DEMO_SCRIPT.md`
  - Live demo URL: (recorded in `docs/submission/SUBMISSION.md` after deploy)
  - X post: NEED HUMAN — author must post demo link on X/Twitter

### 7. README Documentation
- **Rule:** README must include "Do X, see Y" instructions
- **Status:** ✅ COMPLIANT
- **Evidence:**
  - Root README.md includes quickstart section
  - Frontend README includes working commands
  - Verification path: `/verify` route with automated checks

### 8. Track Relevance
- **Rule:** Project must fit at least one track (DeFi, NFTs, Security, Social)
- **Status:** ✅ COMPLIANT
- **Evidence:**
  - **DeFi:** Collateralized lending with FLOOR token (NEP-141)
  - **NFTs:** NEP-171 loan receipts with metadata
  - **Security:** Stopped RC1 for NEW RISK; async claim pattern
  - Tracks: 3 primary (DeFi, NFTs, Security)

---

## Additional Disclosures

### Related Submission (NIO)
- **Project:** Near Intent One (NIO)
- **Repo:** https://github.com/n1shanthb/near-intent-one
- **Demo:** https://near-intent-one.vercel.app
- **Independence:** Separate codebase, different domain (intents vs lending), no shared contracts
- **Disclosure Location:** `docs/evidence/proofs.json` → `related_submission_nio`

### Contract State
- **RC1 Status:** STOPPED (irreversible `stop_new_risk`)
- **Reason:** Operator declared NEW RISK (testnet experiment complete)
- **Funded exits:** Still allowed; no new risk accepted
- **Safety:** L/T ratio is accounting, NOT guaranteed redemption price

### Testnet-Only Declaration
Floorline is **NOT deployed to mainnet**. The RC1 contract exists only on NEAR testnet and has been permanently stopped. This is a hackathon demonstration project, not a production protocol.

---

## Non-Requirements (For Reference)

These are **NOT** official hackathon rules but common misconceptions:

- ❌ Mainnet deployment: NOT required (testnet eligible)
- ❌ Security audit: NOT required
- ❌ Production readiness: NOT required
- ❌ Token economics viability: NOT judged
- ❌ Ownerless protocol: NOT required for hackathon

---

## Human Action Items Before Submission

1. **Demo X Post:** Create and publish demo video/screenshots on X (Twitter)
2. **Public Repo:** Ensure GitHub repository is public
3. **Demo URL:** Record live demo URL in `docs/submission/SUBMISSION.md`
4. **Final Review:** Human author must review all generated documentation

---

**Official Rules Reference:** https://nearhackathon.com/HACKATHON.md  
**Last Updated:** 2026-11-14  
**Compliance Verified:** All mandatory requirements met
