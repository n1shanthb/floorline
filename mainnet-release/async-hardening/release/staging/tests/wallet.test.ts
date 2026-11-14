import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ logging: vi.fn(), initialize: vi.fn(), create: vi.fn(), getAccount: vi.fn(), account: { identifier: { blockchain: "near", network: "testnet", accountId: "test-only.testnet" } } }));
vi.mock("@meteorwallet/sdk", () => ({ MeteorConnect: class { setLoggingLevel = f.logging; initialize = f.initialize; createAction = f.create; getAccount = f.getAccount; } }));
describe("Meteor wallet-only signing", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); f.account.identifier.network = "testnet"; f.getAccount.mockResolvedValue(f.account); f.initialize.mockResolvedValue(undefined); f.create.mockImplementation(async ({id}) => ({ promptForExecution: async () => id === "near::sign_in" ? f.account : id === "near::sign_transactions" ? [{transaction:{hash:"test-only-hash"}}] : undefined })); });
  it("requests account-only testnet login without generating an app access key", async () => {
    const m = await import("../src/lib/wallet"); await m.connectWallet();
    expect(f.create).toHaveBeenCalledWith({id:"near::sign_in",input:{target:{blockchain:"near",network:"testnet"}}});
    expect(f.initialize.mock.calls[0][0].nearKeyStoreProvider).toBeUndefined();
  });
  it("forces wallet approval even for zero-deposit calls", async () => {
    const m = await import("../src/lib/wallet"); await m.signRequest({title:"Test",method:"redeem",args:{amount:"1",min_out:"1"},deposit:"0",gas:"30000000000000",details:[]},"test-only.testnet");
    const request = f.create.mock.calls[0][0]; expect(request.id).toBe("near::sign_transactions");expect(request.input.useFunctionCallKey).toBe(false);expect(request.input.transactions).toHaveLength(1);expect(request.input.target.network).toBe("testnet");
  });
  it("rejects changed signer and wrong network without prompting", async () => {
    const m = await import("../src/lib/wallet"); const action={title:"Test",method:"redeem",args:{},deposit:"0",gas:"1",details:[]};
    await expect(m.signRequest(action,"other.testnet")).rejects.toThrow("account changed");f.account.identifier.network="mainnet";await expect(m.signRequest(action,"test-only.testnet")).rejects.toThrow("network");expect(f.create).not.toHaveBeenCalled();
  });
  it("disconnects through Meteor and notifies the existing UI subscription", async () => {
    const m=await import("../src/lib/wallet"),s=await m.getSelector(),listener=vi.fn();s.store.observable.subscribe(listener);await m.disconnectWallet();expect(f.create.mock.calls[0][0].id).toBe("near::sign_out");expect(listener).toHaveBeenCalled();expect(s.store.getState().accounts).toEqual([]);
  });
  it("rejects unapproved receiver before a signing prompt", async()=>{const m=await import("../src/lib/wallet");await expect(m.signRequest({title:"Test",receiver:"unapproved.testnet",method:"issue",args:{},deposit:"1",gas:"1",details:[]},"test-only.testnet")).rejects.toThrow("Unapproved transaction receiver");expect(f.create).not.toHaveBeenCalled();});
});