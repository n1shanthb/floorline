/**
 * Remux video with a dedicated bottom caption strip (never covers product UI).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ff =
  process.env.FFMPEG ||
  "C:/Users/Nishanth/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
const fp =
  process.env.FFPROBE ||
  "C:/Users/Nishanth/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffprobe.exe";

const srtPath = path.join(__dirname, "FLOORLINE_DEMO.srt");
const assPath = path.join(__dirname, "FLOORLINE_DEMO.ass");
const silent = path.join(__dirname, "work", "video_silent.mp4");
const audio = path.join(__dirname, "audio", "narration.mp3");
const outMp4 = path.join(__dirname, "FLOORLINE_DEMO.mp4");
const qa = path.join(__dirname, "qa-caption-frame.jpg");

function srtTimeToAss(t) {
  const m = t.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return "0:00:00.00";
  const h = Number(m[1]);
  const cs = Math.round(Number(m[4].padEnd(3, "0").slice(0, 3)) / 10);
  return `${h}:${m[2]}:${m[3]}.${String(cs).padStart(2, "0")}`;
}

function wrapLine(text, max = 68) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2).join("\\N");
}

const srt = readFileSync(srtPath, "utf8").replace(/^\uFEFF/, "");
const blocks = srt.split(/\r?\n\r?\n/).map((b) => b.trim()).filter(Boolean);
const dialogues = [];
for (const block of blocks) {
  const lines = block.split(/\r?\n/);
  const time = lines.find((l) => l.includes("-->"));
  if (!time) continue;
  const [start, end] = time.split("-->").map((s) => s.trim());
  const text = lines
    .slice(lines.indexOf(time) + 1)
    .join(" ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) continue;
  dialogues.push(
    `Dialogue: 0,${srtTimeToAss(start)},${srtTimeToAss(end)},Default,,0,0,0,,${wrapLine(text)}`,
  );
}

// Caption lives only in the bottom strip (y≈1000–1080)
const ass = `[Script Info]
Title: Floorline demo
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,15,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,0,0,0,2,60,60,18,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogues.join("\n")}
`;
writeFileSync(assPath, ass, "utf8");
if (!existsSync(silent)) throw new Error("Missing work/video_silent.mp4");

const assEsc = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
// Scale product UI into top 980px, solid caption bar below, then burn ASS into the bar.
const vf = [
  "scale=1920:980:force_original_aspect_ratio=decrease",
  "pad=1920:1080:(ow-iw)/2:0:black",
  `ass='${assEsc}'`,
].join(",");

execFileSync(
  ff,
  [
    "-y",
    "-i",
    silent,
    "-i",
    audio,
    "-vf",
    vf,
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
  ],
  { stdio: "inherit" },
);

execFileSync(
  ff,
  ["-y", "-ss", "00:00:10", "-i", outMp4, "-frames:v", "1", "-update", "1", "-q:v", "2", qa],
  { stdio: "inherit" },
);

const dur = execFileSync(
  fp,
  ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", outMp4],
  { encoding: "utf8" },
).trim();
console.log("OK", outMp4, "duration=", dur, "qa=", qa);
