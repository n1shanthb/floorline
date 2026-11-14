import type { IMeteorConnectAccount } from "@meteorwallet/sdk";
import type { RpcOutcome } from "./rpc";
import { CONTRACT, DAO } from "./config";
let sdkPromise: Promise<import("@meteorwallet/sdk").MeteorConnect> | undefined;
let current: IMeteorConnectAccount | undefined;
const listeners = new Set<() => void>();
const target = { blockchain: "near", network: "testnet" } as const;
function notify() { for (const listener of listeners) listener(); }
async function sdk() {
  sdkPromise ??= import("@meteorwallet/sdk").then(async ({ MeteorConnect }) => {
    const connect = new MeteorConnect();
    connect.setLoggingLevel("none");
    await connect.initialize({
      storage: {
        getItem: async (key: string) => localStorage.getItem(`floorline-rc1:meteor:${key}`),
        setItem: async (key: string, value: string) => localStorage.setItem(`floorline-rc1:meteor:${key}`, value),
        removeItem: async (key: string) => localStorage.removeItem(`floorline-rc1:meteor:${key}`),
      },
    });
    return connect;
  });
  return sdkPromise;
}
function check(account: IMeteorConnectAccount | undefined) {
  if (account && (account.identifier.blockchain !== "near" || account.identifier.network !== "testnet")) throw new Error("Wrong wallet network: testnet only");
  return account;
}
// Retain the existing App subscription surface; public account state only.
export async function getSelector() {
  current = check(await (await sdk()).getAccount(target));
  return {
    options: { network: { networkId: "testnet" } },
    store: {
      getState: () => ({ accounts: current ? [{ accountId: current.identifier.accountId, active: true }] : [] }),
      observable: { subscribe: (listener: () => void) => { listeners.add(listener); return { unsubscribe: () => listeners.delete(listener) }; } },
    },
  };
}
export interface ActionRequest {
  receiver?: string; title: string; method: string; args: Record<string, unknown>;
  deposit: string; gas: string; details: string[]; warning?: string;
}
export function receiverFor(request: ActionRequest): string {
  const receiver = request.receiver ?? CONTRACT;
  if (receiver !== CONTRACT && receiver !== DAO) throw new Error("Unapproved transaction receiver");
  return receiver;
}
export async function connectWallet() {
  const action = await (await sdk()).createAction({ id: "near::sign_in", input: { target } });
  // Deliberately omit addFunctionCallKey: no app-held key is requested/generated.
  current = check(await action.promptForExecution());
  notify();
}
export async function disconnectWallet() {
  const connect = await sdk(); const account = check(await connect.getAccount(target));
  if (account) { const action = await connect.createAction({ id: "near::sign_out", input: { target: account.identifier } }); await action.promptForExecution(); }
  current = undefined; notify();
}
export async function signRequest(request: ActionRequest, signer: string): Promise<RpcOutcome | undefined> {
  const connect = await sdk(), account = check(await connect.getAccount(target));
  if (!account || account.identifier.accountId !== signer) throw new Error("Wallet account changed. Review again.");
  const { actionCreators } = await import("@near-js/transactions");
  const action = await connect.createAction({
    id: "near::sign_transactions",
    input: {
      target: account.identifier,
      useFunctionCallKey: false,
      transactions: [{ receiverId: receiverFor(request), actions: [actionCreators.functionCall(request.method, request.args, BigInt(request.gas), BigInt(request.deposit))] }],
    },
  });
  const outcomes = await action.promptForExecution();
  return outcomes[0] as unknown as RpcOutcome | undefined;
}