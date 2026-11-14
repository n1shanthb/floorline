# Demo video production notes

## Tooling path

- Preferred UltraDemo: https://github.com/ultrademo-hq/ultrademo (Claude Code skill; macOS/Linux).
- This production ran on Windows 11 + Node 22 + Playwright + edge-tts + FFmpeg.
- WSL Ubuntu has Node 22 + FFmpeg; UltraDemo scaffold was cloned for reference under `~/ultrademo` when available.
- No ElevenLabs / paid narration. Voice: Microsoft Edge neural TTS `en-US-GuyNeural`.
- No wallet signatures. No new chain transactions. Read-only captures only.

## Authoritative RC1 facts used

- Contract: `rc1.floorline-g3-20261111-6702ea.testnet`
- Code hash: `4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az`
- L = `10180000000000000000000` yoctoNEAR = **0.01018 NEAR**
- T = `9000000000000000000000` base units = **0.009 FLOOR**
- Acceptance: 40/40 FINAL_VERIFIED; `stopped: true`
- SDK: near-sdk **5.30.1**
