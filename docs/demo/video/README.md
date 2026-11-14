# Floorline demo video package

Narrated, proof-driven 16:9 demo for a **free X account** (≤140s / ≤512 MB).

## Deliverables

| File | Role |
| --- | --- |
| [FLOORLINE_DEMO.mp4](FLOORLINE_DEMO.mp4) | Final H.264 + AAC video (~125s, ~10 MB) |
| [FLOORLINE_DEMO.srt](FLOORLINE_DEMO.srt) | Burned-in + sidecar captions |
| [NARRATION.md](NARRATION.md) | Spoken transcript |
| [FLOORLINE_DEMO_THUMB.jpg](FLOORLINE_DEMO_THUMB.jpg) | Poster / thumbnail |
| [FLOORLINE_DEMO_PREVIEW.gif](FLOORLINE_DEMO_PREVIEW.gif) | Optional README GIF |
| [STORYBOARD.md](STORYBOARD.md) | Scene timing |
| [NOTES.md](NOTES.md) | Tooling + fallback notes |
| [X post draft](../submission/X_VIDEO_POST.md) | Copy/paste X text (not published) |

## Spec (ffprobe)

- Duration: **125.0 s** (< 140)
- Size: **~10.3 MB** (≪ 512)
- 1920×1080 · 30 fps · H.264 · AAC
- Voice: Microsoft Edge neural TTS `en-US-GuyNeural` (free)
- Captions burned + `.srt` sidecar

## Capture honesty

Live Floorline pages (`floorline-delta.vercel.app`) were captured with Playwright.

`testnet.nearblocks.io` HTML was **Cloudflare-blocked** during automation. Proof scenes use **recorded evidence frames** built from `docs/evidence/proofs.json` with the **real explorer URL** in a browser chrome bar, labeled `RECORDED EVIDENCE` / `FINAL_VERIFIED`. No fabricated success badges.

## Reproduce

```bash
cd frontend
npx playwright install chromium
node scripts/demo-capture.mjs
node scripts/render-proof-pages.mjs
cd ../docs/demo/video
python -m edge_tts --voice en-US-GuyNeural --rate=-5% --file audio/narration.txt --write-media audio/narration.mp3 --write-subtitles FLOORLINE_DEMO.srt
node assemble.mjs
```

UltraDemo (`ultrademo-hq/ultrademo`) was inspected in WSL; full interactive Claude Code skill setup was not required because this Windows Playwright + FFmpeg path already produced a X-ready MP4.
