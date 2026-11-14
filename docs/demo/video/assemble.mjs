/**
 * Assemble Floorline demo MP4 from captures + narration + burned captions.
 * Requires ffmpeg/ffprobe on PATH.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const captures = path.join(__dirname, "captures");
const audio = path.join(__dirname, "audio", "narration.mp3");
const srt = path.join(__dirname, "FLOORLINE_DEMO.srt");
const work = path.join(__dirname, "work");
const outMp4 = path.join(__dirname, "FLOORLINE_DEMO.mp4");
const thumb = path.join(__dirname, "FLOORLINE_DEMO_THUMB.jpg");
const gif = path.join(__dirname, "FLOORLINE_DEMO_PREVIEW.gif");

mkdirSync(work, { recursive: true });
process.chdir(__dirname);

const ff =
  process.env.FFMPEG ||
  "C:/Users/Nishanth/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
const fp =
  process.env.FFPROBE ||
  "C:/Users/Nishanth/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffprobe.exe";

function run(bin, args) {
  console.log(bin, args.join(" "));
  execFileSync(bin, args, { stdio: "inherit", cwd: __dirname });
}

function durationOf(file) {
  return Number(
    execFileSync(
      fp,
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { encoding: "utf8" },
    ).trim(),
  );
}

if (!existsSync(audio)) throw new Error("Missing narration.mp3");
const total = durationOf(audio);
console.log("Narration duration:", total.toFixed(3), "s");

// Scene → image mapping timed to narration beats (seconds)
const timeline = [
  { file: "01_landing.png", start: 0.0, end: 6.5, title: "FLOORLINE" },
  { file: "02_overview.png", start: 6.5, end: 17.8, title: "On-chain reserves + credit" },
  { file: "03_treasury.png", start: 17.8, end: 33.2, title: "NEP-141 / L over T accounting / 20 percent tax" },
  { file: "05_redeem_tx.png", start: 33.2, end: 46.3, title: "Proof · native NEAR payout" },
  { file: "04_loans.png", start: 46.3, end: 51.8, title: "Lender-funded loans · NFT rights" },
  { file: "06_nft_transfer_tx.png", start: 51.8, end: 57.0, title: "Proof · NFT transfer" },
  { file: "07_repay_tx.png", start: 57.0, end: 65.8, title: "Proof · NFT-holder repayment" },
  { file: "08_default_tx.png", start: 65.8, end: 73.8, title: "Proof · default settlement" },
  { file: "09_stop_tx.png", start: 73.8, end: 82.8, title: "NEW RISK STOPPED" },
  { file: "10_unregister_tx.png", start: 82.8, end: 91.2, title: "POST-STOP EXIT VERIFIED" },
  { file: "12_verify.png", start: 91.2, end: 100.0, title: "40/40 FINAL_VERIFIED" },
  { file: "13_judges.png", start: 100.0, end: 106.0, title: "AI-readable judge prompts" },
  { file: "14_governance.png", start: 106.0, end: 116.0, title: "Unstoppable DeFi / NFTs That Do Something / AI Security and Defense" },
  { file: "11_contract.png", start: 116.0, end: total, title: "floorline-delta.vercel.app/verify" },
];

const available = new Set(readdirSync(captures).filter((f) => f.endsWith(".png")));
const used = timeline.map((t) => {
  if (!available.has(t.file)) {
    const fallback = [...available][0];
    console.warn(`Missing ${t.file}, fallback ${fallback}`);
    return { ...t, file: fallback };
  }
  return t;
});

// Build per-scene clips with subtle zoom + title overlay
const clips = [];
used.forEach((scene, i) => {
  const dur = Math.max(0.8, scene.end - scene.start);
  const src = path.join(captures, scene.file);
  const clip = path.join(work, `clip_${String(i).padStart(2, "0")}.mp4`);
  const title = scene.title
    .replace(/\\/g, "")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/%/g, " percent")
    .replace(/&/g, "and");
  const font = "C\\\\:/Windows/Fonts/arial.ttf";
  // scale to 1920x1080 cover, soft zoom, bottom caption bar
  const frames = Math.max(30, Math.round(dur * 30));
  const vf = [
    "scale=1920:1080:force_original_aspect_ratio=increase",
    "crop=1920:1080",
    `zoompan=z='min(1.06,1+0.0012*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`,
    `drawbox=x=0:y=980:w=1920:h=100:color=black@0.55:t=fill`,
    `drawtext=fontfile=${font}:text='${title}':fontcolor=white:fontsize=34:x=40:y=1012`,
  ].join(",");
  run(ff, [
    "-y",
    "-loop",
    "1",
    "-i",
    src,
    "-vf",
    vf,
    "-t",
    dur.toFixed(3),
    "-r",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-an",
    clip,
  ]);
  clips.push(clip);
});

const listFile = path.join(work, "concat.txt");
writeFileSync(listFile, clips.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n"));
const silent = path.join(work, "video_silent.mp4");
run(ff, [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  listFile,
  "-c",
  "copy",
  silent,
]);

// Burn captions + mux narration (run from video dir for simple srt path)
const srtName = "FLOORLINE_DEMO.srt";
run(ff, [
  "-y",
  "-i",
  silent,
  "-i",
  audio,
  "-vf",
  `subtitles=${srtName}:force_style='FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=48'`,
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "20",
  "-c:a",
  "aac",
  "-b:a",
  "160k",
  "-shortest",
  "-r",
  "30",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  outMp4,
]);

// Thumbnail from verify scene
const verifyShot = path.join(captures, "12_verify.png");
const thumbSrc = existsSync(verifyShot) ? verifyShot : path.join(captures, used[0].file);
const font = "C\\\\:/Windows/Fonts/arialbd.ttf";
run(ff, [
  "-y",
  "-i",
  thumbSrc,
  "-vf",
  `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,drawbox=x=0:y=0:w=1920:h=220:color=black@0.45:t=fill,drawtext=fontfile=${font}:text='FLOORLINE · 40/40 FINAL_VERIFIED':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=84`,
  "-frames:v",
  "1",
  thumb,
]);

// Short GIF preview (~4s from start)
run(ff, [
  "-y",
  "-i",
  outMp4,
  "-t",
  "4",
  "-vf",
  "fps=10,scale=640:-1:flags=lanczos",
  gif,
]);

const size = Number(
  execFileSync("powershell", [
    "-NoProfile",
    "-Command",
    `(Get-Item '${outMp4}').Length`,
  ], { encoding: "utf8" }).trim(),
);
const dur = durationOf(outMp4);
const probe = execFileSync(
  fp,
  [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate,codec_name",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name",
    "-show_entries",
    "format=duration,size",
    "-of",
    "json",
    outMp4,
  ],
  { encoding: "utf8" },
);

writeFileSync(
  path.join(__dirname, "FFPROBE.json"),
  JSON.stringify(
    {
      path: outMp4,
      duration_sec: dur,
      size_bytes: size,
      size_mb: +(size / (1024 * 1024)).toFixed(2),
      under_140s: dur < 140,
      under_512mb: size <= 512 * 1024 * 1024,
      probe: JSON.parse(probe),
    },
    null,
    2,
  ),
);

console.log("\n=== OUTPUT ===");
console.log(outMp4);
console.log(`duration=${dur.toFixed(2)}s size=${(size / (1024 * 1024)).toFixed(2)} MB`);
console.log("thumb:", thumb);
console.log("gif:", gif);
