# Floorline demo script (60–90 seconds)

**Goal:** Verifiable engineering, not hype. No wallet required for the proof path.

1. **Landing (5s)** — “Floorline: NEAR-backed FLOOR + NFT lending on testnet. RC1 acceptance 40/40; new risk permanently stopped.”
2. **Reserve (10s)** — Open /verify live L/T. Say: “L/T is accounting, not a promised redemption price. Tax parameter 20%.”
3. **Redemption payout (10s)** — Open withdraw_redemption `EyiBXwpRXnkJmxYCmYT58UpKZzpw57BYs3dkJ6n67ZbA`.
4. **Loan lifecycle (15s)** — Filter lending proofs: fund_offer → accept_offer → principal withdraw.
5. **NFT transfer + repay (15s)** — `GKuJWQRG…` then repay `CzkQir6u…`.
6. **Default (5s)** — `GFvtYszD…`.
7. **Stop (10s)** — `65mFsU6o…` irreversible new-risk stop.
8. **Post-stop exit (10s)** — unregister `2oKARd2o…`.
9. **Evidence viewer (5s)** — catalog + download proofs.json.
10. **Judge prompts (5s)** — /judges → Claude Code & Codex; `npm run judge:verify`.

**Close:** “Same author separately submits NEAR Intent One — different product, different proofs.”

**X post must:** built at NEAR HACKATHON, @NEARProtocol #NEARHackathon, attach video/screenshots, link repo + https://floorline.vercel.app.
