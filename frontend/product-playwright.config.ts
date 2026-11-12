import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  reporter: [
    ["list"],
    ["json", { outputFile: "qa/product-completion/browser-results.json" }],
  ],
  outputDir: "qa/product-completion/test-results",
});
