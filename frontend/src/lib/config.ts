export const NETWORK = "testnet" as const;
/** RC1 public-testnet acceptance contract (permanently stopped for new risk). */
export const CONTRACT = "rc1.floorline-g3-20261111-6702ea.testnet";
export const CODE_HASH = "4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az";
export const GUARDIAN = "floorline-g3-20261111-6702ea.testnet";
/** Historical Gate-3 / v1 demo contract — archived evidence only. */
export const HISTORICAL_V1_CONTRACT =
  "floor.floorline-g3-20261111-6702ea.testnet";
export const HISTORICAL_V1_CODE_HASH =
  "6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9";
export const DAO = "floorline-g3-20261111-6702ea.sputnikv2.testnet";
export const DAO_HASH = "AA4nA45vauiac3jdVwJTzSdUP3oj2r1fDaPAb2mHdgcH";
export const RPC =
  import.meta.env.VITE_RPC_URL || "https://rpc.testnet.near.org";
export const EXPLORER = "https://testnet.nearblocks.io";
export const txLink = (hash: string) =>
  `${EXPLORER}/txns/${encodeURIComponent(hash)}`;
export const accountLink = (id: string) =>
  `${EXPLORER}/address/${encodeURIComponent(id)}`;
export const SOURCE = "https://github.com/n1shanthb/floorline";
export const NIO_REPO = "https://github.com/n1shanthb/near-intent-one";
export const NIO_DEMO = "https://near-intent-one.vercel.app";
export const NIO_VERIFY = "https://near-intent-one.vercel.app/verify";
export const NIO_PROOF_INDEX =
  "https://github.com/n1shanthb/near-intent-one/blob/master/docs/PROOF_INDEX.md";
export const FRESH_MS = 60_000;
export const RECORD_HEADROOM = 10n ** 22n; // 0.01 NEAR frontend cushion, not an on-chain minimum
export const ACCEPTANCE = {
  verifiedRows: 40,
  status: "ACCEPTANCE_COMPLETE_BROWSER_UI_EVIDENCE_VERIFIED",
  stopTx: "65mFsU6oiA9V8UDUbdfj782zVpMrN69VxNRZuPT12UX3",
  unregisterTx: "2oKARd2oGXcS8s5y1Xrqv7b5KP3CawWBjEBwPnRf6bHE",
  withdrawStorageTx: "JDWdcjQbBBvj6SMzh1abvujHduSdo9nD14ihPPLxnKhL",
} as const;
