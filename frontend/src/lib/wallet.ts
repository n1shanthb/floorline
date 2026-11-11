import type { WalletSelector } from "@near-wallet-selector/core";
import type { RpcOutcome } from "./rpc";
import { CONTRACT, RPC } from "./config";
let selectorPromise: Promise<WalletSelector> | undefined;
export function getSelector() {
  selectorPromise ??= Promise.all([
    import("@near-wallet-selector/core"),
    import("@near-wallet-selector/my-near-wallet"),
  ]).then(async ([{ setupWalletSelector }, { setupMyNearWallet }]) =>
    setupWalletSelector({
      network: {
        networkId: "testnet",
        nodeUrl: RPC,
        helperUrl: "https://helper.testnet.near.org",
        explorerUrl: "https://testnet.nearblocks.io",
        indexerUrl: "https://api-testnet.nearblocks.io",
      },
      modules: [
        setupMyNearWallet({ walletUrl: "https://testnet.mynearwallet.com" }),
      ],
      debug: false,
    }),
  );
  return selectorPromise;
}
export interface ActionRequest {
  title: string;
  method: string;
  args: Record<string, unknown>;
  deposit: string;
  gas: string;
  details: string[];
  warning?: string;
}
export async function connectWallet() {
  const s = await getSelector();
  if (s.options.network.networkId !== "testnet")
    throw new Error("Wrong wallet network");
  const wallet = await s.wallet("my-near-wallet");
  if (
    wallet.id !== "my-near-wallet" ||
    (wallet.type !== "browser" && wallet.type !== "injected")
  )
    throw new Error("My NEAR Wallet approval required");
  await wallet.signIn({});
}
export async function disconnectWallet() {
  const s = await getSelector();
  if (s.isSignedIn()) await (await s.wallet()).signOut();
}
export async function signRequest(
  request: ActionRequest,
  signer: string,
): Promise<RpcOutcome | undefined> {
  const s = await getSelector();
  if (s.options.network.networkId !== "testnet")
    throw new Error("Testnet only");
  const wallet = await s.wallet();
  if (
    wallet.id !== "my-near-wallet" ||
    (wallet.type !== "browser" && wallet.type !== "injected")
  )
    throw new Error("My NEAR Wallet approval required");
  const accounts = await wallet.getAccounts();
  if (!accounts.some((a) => a.accountId === signer))
    throw new Error("Wallet account changed. Review again.");
  // The batch browser-wallet path always opens the wallet, even for zero-deposit calls.
  // Unlike the single-call path, it cannot silently use a previously stored function-call key.
  const { actionCreators } = await import("@near-js/transactions");
  const response: unknown = await wallet.signAndSendTransactions({
    transactions: [
      {
        signerId: signer,
        receiverId: CONTRACT,
        actions: [
          actionCreators.functionCall(
            request.method,
            request.args,
            BigInt(request.gas),
            BigInt(request.deposit),
          ),
        ],
      },
    ],
  });
  return Array.isArray(response) ? (response[0] as RpcOutcome) : undefined;
}
