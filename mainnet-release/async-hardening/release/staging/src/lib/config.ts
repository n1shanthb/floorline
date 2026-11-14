export const CONTRACT = import.meta.env.VITE_CONTRACT_ID || "unconfigured-rc1.testnet";
export const DAO = import.meta.env.VITE_DAO_ID || "unconfigured-dao.testnet";
export const CODE_HASH = "4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az";
export const STAGING_CONFIGURED = !!import.meta.env.VITE_CONTRACT_ID && CONTRACT !== "floor.floorline-g3-20261111-6702ea.testnet" && CONTRACT.endsWith(".testnet");
export const CALLBACK_METHODS = ["withdraw_claim", "storage_withdraw", "storage_deposit", "storage_unregister", "retry_storage_refund", "ft_transfer_call", "nft_transfer_call"];
export const DAO_CONFIGURED = !!import.meta.env.VITE_DAO_ID;
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
