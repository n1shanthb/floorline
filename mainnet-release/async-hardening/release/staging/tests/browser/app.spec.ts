import { expect, test, type Page } from "@playwright/test";
import evidence from "../../src/data/evidence.json" with { type: "json" };
const contract = evidence.contract;
const chainNow = "1794380000000000000";
async function mockedRpc(
  page: Page,
  options: {
    wrongChain?: boolean;
    offline?: boolean;
    connected?: boolean;
    callbackUnknown?: boolean;
    activeNft?: boolean;
    claimState?: number;
    walletReject?: boolean;
    transactionFailure?: boolean;
    poor?: boolean;
    stateful?: boolean;
  } = {},
) {
  let reconciled = false;
  let lastMethod = "";
  await page.route("https://test.rpc.fastnear.com", async (route) => {
    if (options.offline) {
      await route.abort("failed");
      return;
    }
    const body = route.request().postDataJSON(),
      p = body.params;
    let result: unknown;
    if (body.method === "status")
      result = { chain_id: options.wrongChain ? "mainnet" : "testnet" };
    else if (body.method === "block")
      result = {
        header: {
          hash: "test-fixture-block",
          height: 987654,
          timestamp_nanosec: chainNow,
        },
      };
    else if (body.method === "gas_price") result = { gas_price: "100000000" };
    else if (body.method === "tx") {
      const intent = await page.evaluate(() =>
        (
          (
            window as unknown as {
              __testSubmissions: Array<{
                args: unknown;
                method: string;
                gas: string;
                deposit: string;
                receiver?: string;
              }>;
            }
          ).__testSubmissions || []
        ).at(-1),
      );
      result = {
        final_execution_status: "FINAL",
        transaction: {
          hash: "UI_TEST_TRANSACTION",
          signer_id: "ui-test.testnet",
          receiver_id: intent?.receiver || contract,
          actions: [
            {
              FunctionCall: {
                method_name: intent?.method || "redeem",
                args: Buffer.from(
                  JSON.stringify(
                    intent?.args || {
                      amount: "100000000000000000000000",
                      min_out: "1",
                    },
                  ),
                ).toString("base64"),
                deposit: intent?.deposit || "0",
                gas: intent?.gas || "30000000000000",
              },
            },
          ],
        },
        status: options.transactionFailure
          ? { Failure: "test-only root rejection" }
          : { SuccessValue: Buffer.from('"99"').toString("base64") },
        receipts_outcome: [
          {
            id: "test-only-receipt",
            outcome: {
              executor_id: contract,
              logs: [],
              status: options.callbackUnknown
                ? { Failure: "test-only callback failure" }
                : { SuccessValue: "" },
            },
          },
        ],
      };
      if (
        options.stateful &&
        !options.transactionFailure &&
        !options.callbackUnknown
      ) {
        reconciled = true;
        lastMethod = intent?.method || "";
      }
    } else if (p.request_type === "view_account")
      result = {
        ...evidence.snapshot.account,
        code_hash:
          p.account_id === evidence.dao
            ? "AA4nA45vauiac3jdVwJTzSdUP3oj2r1fDaPAb2mHdgcH"
            : evidence.snapshot.account.code_hash,
        amount:
          p.account_id === contract
            ? evidence.snapshot.account.amount
            : options.poor
              ? "1"
              : "10000000000000000000000000",
      };
    else if (p.request_type === "call_function") {
      const args = JSON.parse(Buffer.from(p.args_base64, "base64").toString());
      let value: unknown;
      switch (p.method_name) {
        case "accounting":
          value = evidence.snapshot.ledger;
          break;
        case "ft_balance_of":
          value =
            options.stateful && reconciled
              ? "100000000000000000000000"
              : "200000000000000000000000";
          break;
        case "storage_balance_of":
          value = {
            total: "50000000000000000000000",
            available: "50000000000000000000000",
          };
          break;
        case "storage_balance_bounds":
          value = { min: "2000000000000000000000", max: null };
          break;
        case "quote": {
          const l = BigInt(evidence.snapshot.ledger.L),
            t = BigInt(evidence.snapshot.ledger.T),
            c = BigInt(args.amount);
          value = (
            (l * c * (8000n * t + 2000n * c)) /
            (10000n * t * t)
          ).toString();
          break;
        }
        case "get_loan":
          value =
            args.loan_id === "2"
              ? options.activeNft
                ? {
                    ...evidence.loans.repaid,
                    state: 1,
                    owner:
                      reconciled && lastMethod === "nft_transfer"
                        ? "test-recipient.testnet"
                        : "ui-test.testnet",
                  }
                : evidence.loans.repaid
              : args.loan_id === "7"
                ? evidence.loans.defaulted
                : null;
          break;
        case "get_claim":
          value = {
            id: args.claim_id,
            owner: "ui-test.testnet",
            amount: "100000000000000000000",
            state: options.claimState ?? 3,
            kind: 2,
            attempt: "0",
            storage_cost: "1000000000000000000",
          };
          break;
        case "nft_token":
          value = options.activeNft
            ? {
                token_id: "2",
                owner_id:
                  reconciled && lastMethod === "nft_transfer"
                    ? "test-recipient.testnet"
                    : "ui-test.testnet",
              }
            : null;
          break;
        case "get_policy":
          value = evidence.policy;
          break;
        case "get_last_proposal_id":
          value = 1;
          break;
        case "get_proposal":
          value = evidence.proposal;
          break;
        default:
          value = null;
      }
      result = {
        result: [...Buffer.from(JSON.stringify(value))],
        block_hash: "test-fixture-block",
        block_height: 987654,
      };
    }
    await route.fulfill({ json: { jsonrpc: "2.0", id: body.id, result } });
  });
  if (options.connected)
    await page.addInitScript(() =>
      localStorage.setItem("floorline-rc1:wallet-used", "true"),
    );
  if (options.connected)
    await page.route("**/src/lib/wallet.ts*", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `
 window.__testSubmissions=[];
 export function receiverFor(request){return request.receiver||'${contract}';}
 const accounts=[{accountId:'ui-test.testnet',active:true}];
 export async function getSelector(){return {options:{network:{networkId:'testnet'}},store:{getState:()=>({accounts}),observable:{subscribe:()=>({unsubscribe(){}})}}};}
 export async function connectWallet(){} export async function disconnectWallet(){}
 export async function signRequest(request){window.__testSubmissions.push(request);${options.walletReject ? "throw new Error('User rejected wallet approval');" : "return {transaction:{hash:'UI_TEST_TRANSACTION'}};"}}
 `,
      }),
    );
}
test("all six routes render, use real components, and have no overflow at 360, 390 and 1440", async ({
  page,
}) => {
  await mockedRpc(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    for (const path of [
      "/",
      "/app",
      "/app/treasury",
      "/app/loans",
      "/app/governance",
      "/app/activity",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      expect(await page.locator('img[src*="screenshots"]').count()).toBe(0);
      if (path !== "/" && width < 768)
        await expect(
          page.getByRole("navigation", { name: "Mobile navigation" }),
        ).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});
test("mobile bottom navigation works and treasury blocks dilutive issuance", async ({
  page,
}) => {
  await mockedRpc(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Treasury" })
    .click();
  await expect(
    page.getByRole("heading", { name: "The treasury." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Issue", exact: true }).click();
  await expect(
    page.getByText("Issuance unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Claims", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your claims, in one place" }),
  ).toBeVisible();
});
test("RPC failure and wrong network never display historical figures as live", async ({
  page,
}) => {
  await mockedRpc(page, { offline: true });
  await page.goto("/app/treasury");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Reserve accounting requires a successful chain read.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.unroute("https://test.rpc.fastnear.com");
  await mockedRpc(page, { wrongChain: true });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Wrong network");
});
test("activity filters preserve historical proof and disconnected governance has no vote control", async ({
  page,
  context,
}) => {
  await mockedRpc(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/app/activity");
  await page
    .getByRole("button", { name: "NFT transfers", exact: true })
    .click();
  await expect(page.locator(".activity-feed .event-row")).toHaveCount(1);
  await page.locator(".activity-feed .event-row").click();
  await expect(page.locator(".receipt-detail h2")).toContainText(
    "Carol transferred",
  );
  await page.getByRole("button", { name: "Copy transaction hash" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    evidence.events[2].tx,
  );
  await page.goto("/app/governance");
  await expect(
    page.getByText("Operator-controlled simulated council.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.getByRole("button", { name: /vote approve/i }).count(),
  ).toBe(0);
});
test("wallet dialog traps focus and closes with Escape; no wallet opens automatically", async ({
  page,
}) => {
  await mockedRpc(page);
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Connect My NEAR Wallet")).toBeVisible();
  for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
test("replays are user-triggered and reduced-motion friendly", async ({
  page,
}) => {
  await mockedRpc(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app/loans");
  await page.getByRole("button", { name: "Play verified replay" }).click();
  await expect(page.getByText("Replay 5/5:", { exact: false })).toBeVisible();
  await page.goto("/app/governance");
  await page.getByRole("button", { name: "Play verified replay" }).click();
  await expect(page.getByText("Replay 4/4:", { exact: false })).toBeVisible();
});
test("connected mocked wallet requires review then explicit approval; no auto-submit", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, callbackUnknown: true });
  await page.goto("/app/treasury");
  await expect(
    page.getByRole("button", { name: "Open connected wallet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review redemption" }).click();
  await expect(page.getByRole("dialog")).toContainText("Approve in wallet");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Approve in wallet" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    /unresolved|does not match/,
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(1);
  await expect(page.getByRole("dialog")).not.toContainText(
    "Confirmed on testnet",
  );
  await page
    .getByRole("button", { name: "Recheck status · never resubmits" })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(1);
});

test("NFT transfer requires a valid recipient and explicit loss-of-rights acknowledgement", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, activeNft: true });
  await page.goto("/app/loans?tab=My%20NFTs");
  await page
    .getByRole("button", { name: "Transfer NFT recovery right" })
    .click();
  const review = page.getByRole("button", { name: "Review NFT transfer" });
  await expect(review).toBeDisabled();
  await page
    .getByLabel("Registered recipient account")
    .fill("test-recipient.testnet");
  await expect(review).toBeDisabled();
  await page.getByRole("checkbox").check();
  await review.click();
  await expect(page.getByRole("dialog")).toContainText(
    "All repayment and collateral recovery rights move",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "0.000000000000000000000001 NEAR",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(0);
});

test("repayment review uses current NFT owner and exact debt; native claim review reserves callback gas", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, activeNft: true, claimState: 0 });
  await page.goto("/app/loans?tab=My%20NFTs");
  await page.getByRole("button", { name: "Review exact repayment" }).click();
  await expect(page.getByRole("dialog")).toContainText("0.11 NEAR");
  await expect(page.getByRole("dialog")).toContainText("Loan NFT burns");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/app/treasury?tab=Claims");
  await page.getByRole("button", { name: "Review withdrawal" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("110 Tgas");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(0);
});

test("overview reads partial tracked claim totals and active NFT ownership", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, activeNft: true, claimState: 0 });
  await page.goto("/app");
  await expect(page.getByText("0.0004 NEAR", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Active tracked NFTs owned").locator(".."),
  ).toContainText("1");
  await expect(
    page.getByText("These totals are not an exhaustive account index.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("mocked final confirmation refreshes position and records browser activity", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, stateful: true });
  await page.goto("/app/treasury");
  await page
    .getByRole("button", { name: "Review redemption", exact: true })
    .click();
  await page.getByRole("button", { name: "Approve in wallet" }).click();
  await expect(page.getByRole("dialog")).toContainText("Confirmed on testnet");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByText(/Available: 0.1 FLOOR/)).toBeVisible();
  await page.goto("/app/activity");
  await expect(
    page.getByRole("region", { name: "This browser transaction history" }),
  ).toContainText("redeem · last check: confirmed");
});
test("wallet rejection clears the pending intent without claiming success", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, walletReject: true });
  await page.goto("/app/treasury");
  await page
    .getByRole("button", { name: "Review redemption", exact: true })
    .click();
  await page.getByRole("button", { name: "Approve in wallet" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "User rejected wallet approval",
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("floorline-rc1:pending")),
  ).toBeNull();
  await expect(page.getByRole("dialog")).not.toContainText(
    "Confirmed on testnet",
  );
});
test("failed native withdrawal remains a known failure, not an unknown payout", async ({
  page,
}) => {
  await mockedRpc(page, {
    connected: true,
    claimState: 0,
    transactionFailure: true,
  });
  await page.goto("/app/treasury?tab=Claims");
  await page.getByRole("button", { name: "Review withdrawal" }).first().click();
  await page.getByRole("button", { name: "Approve in wallet" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "transaction failed on chain",
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("floorline-rc1:pending")),
  ).toBeNull();
});
test("insufficient native balance blocks review before any wallet request", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, poor: true });
  await page.goto("/app/treasury");
  await page
    .getByRole("button", { name: "Review redemption", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Insufficient spendable testnet NEAR",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(0);
});
test("new transfer and DAO proposal reviews show the real receiver and exact bond", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true });
  await page.goto("/app/treasury");
  await page.getByLabel("FLOOR recipient account").fill("recipient.testnet");
  await page.getByRole("button", { name: "Review FLOOR transfer" }).click();
  await expect(page.getByRole("dialog")).toContainText("ft_transfer");
  await expect(page.getByRole("dialog")).toContainText(
    "0.000000000000000000000001 NEAR",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/app/governance");
  await page
    .getByRole("button", { name: "Review new 0.10 NEAR proposal" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(evidence.dao);
  await expect(page.getByRole("dialog")).toContainText("1 NEAR");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(0);
});
test("NFT ownership display refreshes after a mocked final transfer receipt", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, activeNft: true, stateful: true });
  await page.goto("/app/loans?tab=My%20NFTs");
  await page
    .getByRole("button", { name: "Transfer NFT recovery right" })
    .click();
  await page
    .getByLabel("Registered recipient account")
    .fill("test-recipient.testnet");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Review NFT transfer" }).click();
  await page.getByRole("button", { name: "Approve in wallet" }).click();
  await expect(page.getByRole("dialog")).toContainText("Confirmed on testnet");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByText("No matching tracked rights", { exact: true }),
  ).toBeVisible();
});
test("known failed payout permits a separately reviewed guarded restoration", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true, claimState: 2 });
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "floorline-rc1:pending",
      JSON.stringify({
        signer: "ui-test.testnet",
        createdAt: Date.now(),
        hash: "UI_TEST_TRANSACTION",
        request: {
          title: "Native withdrawal",
          method: "withdraw_claim",
          args: { claim_id: "0" },
          deposit: "0",
          gas: "110000000000000",
          details: [],
        },
      }),
    ),
  );
  await page.route("https://test.rpc.fastnear.com", async (route) => {
    const b = route.request().postDataJSON();
    if (b.method !== "tx") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      json: {
        jsonrpc: "2.0",
        id: b.id,
        result: {
          final_execution_status: "FINAL",
          transaction: {
            hash: "UI_TEST_TRANSACTION",
            signer_id: "ui-test.testnet",
            receiver_id: contract,
            actions: [
              {
                FunctionCall: {
                  method_name: "withdraw_claim",
                  args: Buffer.from(JSON.stringify({ claim_id: "0" })).toString(
                    "base64",
                  ),
                  gas: "110000000000000",
                  deposit: "0",
                },
              },
            ],
          },
          status: { SuccessValue: "" },
          receipts_outcome: [
            {
              id: "test-only-native-failure",
              outcome: {
                executor_id: "ui-test.testnet",
                logs: [],
                status: { Failure: "native transfer failed" },
              },
            },
          ],
        },
      },
    });
  });
  await page.goto("/app/treasury?tab=Claims");
  await expect(page.getByRole("dialog")).toContainText("known failure");
  expect(
    await page.evaluate(() => sessionStorage.getItem("floorline-rc1:pending")),
  ).toBeNull();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Review known-failure recovery" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Approve in wallet");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(0);
});
test("callback URL errors cannot discard an unresolved intent", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true });
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "floorline-rc1:pending",
      JSON.stringify({
        signer: "ui-test.testnet",
        createdAt: Date.now(),
        request: {
          title: "Earlier redemption",
          method: "redeem",
          args: { amount: "1", min_out: "1" },
          deposit: "0",
          gas: "30000000000000",
          details: [],
        },
      }),
    ),
  );
  await page.goto(
    "/app/treasury?errorCode=USER_REJECTED&errorMessage=User%20rejected",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "URL parameters alone do not prove cancellation",
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("floorline-rc1:pending")),
  ).not.toBeNull();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(0);
});
test("lender funding supports explicit short expiry terms without a transaction", async ({
  page,
}) => {
  await mockedRpc(page, { connected: true });
  await page.goto("/app/loans");
  await page.getByRole("button", { name: "Create offer", exact: true }).click();
  await page.getByLabel("Term · whole number").fill("120");
  await page.getByLabel("Term unit", { exact: true }).selectOption("seconds");
  await page.getByRole("button", { name: "Review offer funding" }).click();
  await expect(page.getByRole("dialog")).toContainText("Term 120 seconds");
  await expect(page.getByRole("dialog")).toContainText("fund_offer");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __testSubmissions: unknown[] })
          .__testSubmissions.length,
    ),
  ).toBe(0);
});
