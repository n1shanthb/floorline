import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  batch: vi.fn(async () => [{ transaction: { hash: "test-only-hash" } }]),
  single: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  setup: vi.fn(),
  network: "testnet",
}));
vi.mock("@near-wallet-selector/core", () => ({ setupWalletSelector: f.setup }));
vi.mock("@near-wallet-selector/my-near-wallet", () => ({
  setupMyNearWallet: () => ({ id: "test-browser-wallet" }),
}));
describe("explicit browser-wallet approval", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    f.network = "testnet";
    f.setup.mockImplementation(async () => ({
      options: { network: { networkId: f.network } },
      wallet: async () => ({
        type: "injected",
        id: "my-near-wallet",
        signIn: f.signIn,
        signOut: f.signOut,
        getAccounts: async () => [{ accountId: "test-only.testnet" }],
        signAndSendTransactions: f.batch,
        signAndSendTransaction: f.single,
      }),
      isSignedIn: () => true,
    }));
  });
  it("requests login without a function-call key", async () => {
    const m = await import("../src/lib/wallet");
    await m.connectWallet();
    expect(f.signIn).toHaveBeenCalledWith({});
    expect(f.setup.mock.calls[0][0].createAccessKeyFor).toBeUndefined();
  });
  it("always uses external-wallet batch approval, never the local-key single path", async () => {
    const m = await import("../src/lib/wallet");
    await m.signRequest(
      {
        title: "Test only",
        method: "redeem",
        args: { amount: "1", min_out: "1" },
        deposit: "0",
        gas: "30000000000000",
        details: [],
      },
      "test-only.testnet",
    );
    expect(f.batch).toHaveBeenCalledOnce();
    expect(f.single).not.toHaveBeenCalled();
    const tx = f.batch.mock.calls[0] as unknown[];
    expect(tx).toHaveLength(1);
  });
  it("rejects wrong network and changed account before any signing call", async () => {
    const m = await import("../src/lib/wallet");
    await expect(
      m.signRequest(
        {
          title: "Test",
          method: "redeem",
          args: {},
          deposit: "0",
          gas: "1",
          details: [],
        },
        "other.testnet",
      ),
    ).rejects.toThrow("account changed");
    expect(f.batch).not.toHaveBeenCalled();
    vi.resetModules();
    f.network = "mainnet";
    const wrong = await import("../src/lib/wallet");
    await expect(wrong.connectWallet()).rejects.toThrow("network");
  });
  it("disconnects through the wallet", async () => {
    const m = await import("../src/lib/wallet");
    await m.disconnectWallet();
    expect(f.signOut).toHaveBeenCalledOnce();
  });
});
