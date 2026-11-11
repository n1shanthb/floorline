export const CONTRACT = "floor.floorline-g3-20261111-6702ea.testnet";
export const DAO = "floorline-g3-20261111-6702ea.sputnikv2.testnet";
export const CODE_HASH = "6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9";
export const DAO_HASH = "AA4nA45vauiac3jdVwJTzSdUP3oj2r1fDaPAb2mHdgcH";
export const RPC =
  import.meta.env.VITE_RPC_URL || "https://test.rpc.fastnear.com";
export const EXPLORER = "https://testnet.nearblocks.io";
export const txLink = (hash: string) =>
  `${EXPLORER}/txns/${encodeURIComponent(hash)}`;
export const accountLink = (id: string) =>
  `${EXPLORER}/address/${encodeURIComponent(id)}`;
export const SOURCE = "https://github.com/n1shanthb/floorline";
export const FRESH_MS = 60_000;
export const RECORD_HEADROOM = 10n ** 22n; // 0.01 NEAR frontend cushion, not an on-chain minimum
