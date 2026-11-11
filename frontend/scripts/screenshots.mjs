import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const results = [];
const routes = [
  ["landing", "/"],
  ["overview", "/app"],
  ["treasury", "/app/treasury"],
  ["loans", "/app/loans"],
  ["governance", "/app/governance"],
  ["activity", "/app/activity"],
];
for (const [device, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [name, path] of routes) {
    await page.goto("http://127.0.0.1:5173" + path);
    await page.waitForTimeout(2500);
    await page.evaluate(() => document.fonts.ready);
    if (name !== "landing") await page.locator("h1").waitFor();
    await page.screenshot({
      path: `qa/${name}-${device}.png`,
      fullPage: false,
    });
    await page.screenshot({
      path: `qa/${name}-${device}-full.png`,
      fullPage: true,
    });
    const data = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      title: document.querySelector("h1")?.textContent,
      body: document.body.innerText.slice(0, 1900),
    }));
    results.push({ name, device, ...data, errors: [...errors] });
    console.log(name, device, JSON.stringify(data));
  }
  await context.close();
}
fs.writeFileSync(
  "qa/live-browser-check.json",
  JSON.stringify(results, null, 2),
);
await browser.close();
