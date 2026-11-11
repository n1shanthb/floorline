import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:5173/app");
await page.getByRole("button", { name: "Connect wallet", exact: true }).click();
const waiting = context.waitForEvent("page", { timeout: 20000 });
await page
  .getByRole("button", { name: "Connect My NEAR Wallet", exact: true })
  .click();
try {
  const popup = await waiting;
  await popup.waitForURL("https://testnet.mynearwallet.com/**", {
    timeout: 20000,
  });
  const url = new URL(popup.url());
  const report = {
    kind: "Real wallet login handoff only; no authentication, no signing, no transaction",
    origin: url.origin,
    path: url.pathname,
    requests_contract_key:
      url.searchParams.has("contract_id") || url.searchParams.has("public_key"),
    signed: false,
  };
  fs.writeFileSync(
    "qa/wallet-login-handoff.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  await popup.close();
} catch (e) {
  fs.writeFileSync(
    "qa/wallet-login-handoff.json",
    JSON.stringify(
      { kind: "Login handoff test", error: e.message, signed: false },
      null,
      2,
    ),
  );
  console.log(e.message);
  console.log(await page.locator("body").innerText());
  await page.screenshot({ path: "qa/wallet-login-error.png" });
}
await browser.close();
