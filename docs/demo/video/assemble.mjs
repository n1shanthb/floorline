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

// Scene → image mapping (intro first, then proofs). Ends clamped to narration length.
const timeline = [
  { file: "01_landing.png", start: 0.0, end: 8.0, title: "" },
  { file: "02_overview.png", start: 8.0, end: 22.0, title: "" },
  { file: "03_treasury.png", start: 22.0, end: 36.0, title: "" },
  { file: "05_redeem_tx.png", start: 36.0, end: 48.0, title: "" },
  { file: "04_loans.png", start: 48.0, end: 54.0, title: "" },
  { file: "06_nft_transfer_tx.png", start: 54.0, end: 62.0, title: "" },
  { file: "07_repay_tx.png", start: 62.0, end: 72.0, title: "" },
  { file: "08_default_tx.png", start: 72.0, end: 82.0, title: "" },
  { file: "09_stop_tx.png", start: 82.0, end: 92.0, title: "" },
  { file: "10_unregister_tx.png", start: 92.0, end: 100.0, title: "" },
  { file: "12_verify.png", start: 100.0, end: 110.0, title: "" },
  { file: "13_judges.png", start: 110.0, end: 118.0, title: "" },
  { file: "11_contract.png", start: 118.0, end: total, title: "" },
].map((t) => ({
  ...t,
  start: Math.min(t.start, total),
  end: Math.min(t.end, total),
})).filter((t) => t.end > t.start + 0.4);

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
  // Keep UI readable: soft zoom only — no large title bar fighting captions.
  const frames = Math.max(30, Math.round(dur * 30));
  const vf = [
    "scale=1920:1080:force_original_aspect_ratio=increase",
    "crop=1920:1080",
    `zoompan=z='min(1.04,1+0.0008*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`,
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
  // Small bottom captions: Alignment=2 bottom-center, low MarginV, outline (not huge opaque box)
  `subtitles=${srtName}:force_style='FontName=Arial,FontSize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&H90000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginL=120,MarginR=120,MarginV=22'`,
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

// Keep existing branded poster if present; otherwise skip regenerating from verify shot
if (!existsSync(path.join(__dirname, "FLOORLINE_DEMO_THUMB.png"))) {
  const verifyShot = path.join(captures, "12_verify.png");
  const thumbSrc = existsSync(verifyShot) ? verifyShot : path.join(captures, used[0].file);
  const font = "C\\\\:/Windows/Fonts/arialbd.ttf";
  run(ff, [
    "-y",
    "-i",
    thumbSrc,
    "-vf",
    `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,drawbox=x=0:y=0:w=1920:h=220:color=black@0.45:t=fill,drawtext=fontfile=${font}:text='FLOORLINE 40/40 FINAL_VERIFIED':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=84`,
    "-frames:v",
    "1",
    thumb,
  ]);
}

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
