# Floorline frontend

React + TypeScript + Vite. The frontend is testnet-only and has no server signer, local private-key imports, or contract deployment command.

From `E:\near-2`:

```powershell
.\frontend\run.ps1 dev
# http://127.0.0.1:5173
.\frontend\run.ps1 typecheck
.\frontend\run.ps1 lint
.\frontend\run.ps1 test
.\frontend\run.ps1 test:e2e
.\frontend\run.ps1 build
```

The wrapper sets cache/temp paths on E:. Dependencies are pinned by `package-lock.json`; reinstall with `npm ci` in this folder with TEMP/TMP pointed to `E:\near-2\.tmp`. `.npmrc` keeps the npm cache on E:.

Public configuration only: copy `.env.example` to `.env.local` if an alternative public RPC is needed. Chain identity and contract code hash are checked before actions. No environment variable may contain a private key or server signer.

`npm run evidence` regenerates the public historical evidence export from the repository's validated source, checking event hashes/indexed outcomes. It never loads credentials or submits transactions. `public/demo-evidence.json` is the download shown by Activity & Proof.

Wallet: My NEAR Wallet through NEAR Wallet Selector v10, testnet only. No `createAccessKeyFor` is requested. Every reviewed call uses the browser-wallet batch signing path, including zero-deposit calls, to require wallet approval. A popup may need browser permission. Use HTTPS for a hosted app; this task supplies a local app only.

Routes: `/`, `/app`, `/app/treasury`, `/app/loans`, `/app/governance`, `/app/activity`. Static hosting must rewrite unmatched application paths to `index.html`; no hosting deployment is included. Production assets are in `dist` after build.

There is no exhaustive loan/claim enumeration in this contract. The app reads known demo IDs plus public IDs saved in this browser, with manual lookup. Offers whose duration is unknown require the lender's funding transaction hash; verified terms are rechecked at both review and submission. Governance is read-only. All historical replays are labeled. All financial arithmetic is BigInt; Number conversion is limited to display coordinates, dates and block metadata.

Browser tests use clearly isolated RPC/wallet mocks and never submit real financial transactions. Separate read-only live-browser screenshots are under `qa`. Browser tests use the already installed Chrome executable configured in `playwright.config.ts`; no browser download is needed.

See [implementation report](../FRONTEND_IMPLEMENTATION_REPORT.md) for exact methods, QA results, screenshots, dependency notices and limitations.
