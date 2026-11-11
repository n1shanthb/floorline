# FLOORLINE — Soft Electric UX Reference Pack

**Purpose:** a handoff for Codex to implement the Floorline frontend in `E:\near-2`. User has approved starting frontend implementation with a Revnet-inspired UX and a premium light Gen-Z visual style.

## What's inside

- `CODEX_MASTER_PROMPT.md` — full ready-to-paste implementation prompt.
- `spec/UX_MASTER_SPEC.md` — routes, charts, buttons, interactions, motion, wallet, responsiveness, judge flow.
- `spec/DESIGN_TOKENS.json` — locked visual tokens and animation timings.
- `spec/VERIFIED_DEMO_EVENTS.json` — known historical testnet event hashes; validate against local evidence.
- `spec/REFERENCES.md` — external UX reference URLs.
- `screenshots/00_all_pages_contact_sheet.png` — six-page desktop moodboard.
- `screenshots/*_desktop.png` — six individual desktop visual references (landing, overview, treasury, loans, governance, activity).
- `screenshots/*_mobile.png` — four mobile composition references.
- `mockups/floorline-reference.html` — static HTML/CSS design reference, not production code.
- `assets/` — original SVG vector reference illustrations.

## How to use

1. Unzip the folder to `E:\near-2\design\floorline-ux-reference-pack\` (or another folder inside `E:\near-2`).
2. Open `screenshots/00_all_pages_contact_sheet.png` to see the design direction.
3. In Codex, paste `CODEX_MASTER_PROMPT.md` or the shorter bootstrap prompt in ChatGPT. Tell Codex the folder path if you chose a different location.
4. Codex must inspect the real Rust contract and DAO methods before wiring transactions; the static mockups are *not* a source of contract truth.

## Important accuracy notes

- The previous conversational image previews were illustrative third-party image lookups, not downloadable original image files. This pack instead contains **new original Floorline mockups** so it can be safely copied into the project.
- The reference screenshots contain historical verified testnet figures and illustrative composition. They are **not** live UI and must never be presented as a functioning app.
- The contract has already been deployed and demonstrated. This frontend work must not modify/redeploy contracts or touch private keys.
- The final DAO state is in `post_dao_final_state` in `TESTNET_EVIDENCE.json`; some older top-level statuses describe the pre-DAO pause. Keep current and historical labels separate.
- These mockups depict a desktop sidebar. **Production mobile navigation must be fully implemented** (bottom nav or accessible drawer); static mobile screenshots are not complete navigation designs.
