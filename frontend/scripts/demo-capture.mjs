/**
 * Read-only capture of Floorline UI + NearBlocks proof pages for the demo video.
 * No wallet. No transactions.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../../docs/demo/video/captures");
await mkdir(outDir, { recursive: true });

const shots = [
  { id: "01_landing", url: "https://floorline-delta.vercel.app/", wait: 2500 },
  { id: "02_overview", url: "https://floorline-delta.vercel.app/app", wait: 4000 },
  { id: "03_treasury", url: "https://floorline-delta.vercel.app/app/treasury", wait: 4000 },
  { id: "04_loans", url: "https://floorline-delta.vercel.app/app/loans", wait: 4500 },
  {
    id: "05_redeem_tx",
    url: "https://testnet.nearblocks.io/txns/EyiBXwpRXnkJmxYCmYT58UpKZzpw57BYs3dkJ6n67ZbA",
    wait: 5500,
  },
  {
    id: "06_nft_transfer_tx",
    url: "https://testnet.nearblocks.io/txns/GKuJWQRG7UXPy6SwtboqapKEsYwpAJbDrhUmXJnMMBmz",
    wait: 5500,
  },
  {
    id: "07_repay_tx",
    url: "https://testnet.nearblocks.io/txns/CzkQir6usnSAkph3ksZvjBLTrZfDLERnCCKPNDfWEHGB",
    wait: 5500,
  },
  {
    id: "08_default_tx",
    url: "https://testnet.nearblocks.io/txns/GFvtYszDR36rPXsKeR6udwuJgHoDe1feRTKXBTMDkh3B",
    wait: 5500,
  },
  {
    id: "09_stop_tx",
    url: "https://testnet.nearblocks.io/txns/65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3",
    wait: 5500,
  },
  {
    id: "10_unregister_tx",
    url: "https://testnet.nearblocks.io/txns/2oKARd2oGXcS8s5y1Xrqv7b5KP3CawWBjEBwPnRf6bHE",
    wait: 5500,
  },
  {
    id: "11_contract",
    url: "https://testnet.nearblocks.io/address/rc1.floorline-g3-20261111-6702ea.testnet",
    wait: 5500,
  },
  {
    id: "12_verify",
    url: "https://floorline-delta.vercel.app/verify",
    wait: 4500,
    scroll: 700,
  },
  { id: "13_judges", url: "https://floorline-delta.vercel.app/judges", wait: 3500 },
  {
    id: "14_governance",
    url: "https://floorline-delta.vercel.app/app/governance",
    wait: 4000,
  },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const manifest = [];

for (const shot of shots) {
  const file = `${shot.id}.png`;
  const dest = path.join(outDir, file);
  console.log(`→ ${shot.id}: ${shot.url}`);
  try {
    await page.goto(shot.url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(shot.wait);
    if (shot.scroll) {
      await page.evaluate((y) => window.scrollBy(0, y), shot.scroll);
      await page.waitForTimeout(900);
    }
    try {
      const btn = page.getByRole("button", { name: /accept|agree|got it|close/i }).first();
      if (await btn.isVisible({ timeout: 700 })) await btn.click({ timeout: 1000 });
    } catch {
      /* ignore */
    }
    await page.screenshot({ path: dest, fullPage: false });
    manifest.push({ ...shot, file, ok: true });
    console.log(`  saved ${file}`);
  } catch (e) {
    console.error(`  FAIL ${shot.id}:`, e instanceof Error ? e.message : e);
    manifest.push({
      ...shot,
      file,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

await browser.close();
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Done. ${manifest.filter((m) => m.ok).length}/${manifest.length} captures.`);
