# Mainnet funding and economic budget

This is a planning calculation, not funding authorization. Authorized mainnet
exposure is **0 NEAR**.

On 2026-11-13 the official mainnet RPC reported protocol version 88, storage
staking of `10,000,000,000,000,000,000` yoctoNEAR per byte (0.00001 NEAR), a
current gas price of `100,000,000` yoctoNEAR per gas and a maximum total prepaid
gas value of 1,000 Tgas. Raw values are preserved in
`evidence/MAINNET_PROTOCOL_CONFIG.json`. These must be queried again immediately
before any launch; gas price and transaction cost are not fixed by this report.

The 443,613-byte WASM alone implies 4.43613 NEAR of storage stake at that price.
The contract additionally requires its observed storage usage plus 4,096 bytes
and a 0.1 NEAR operational headroom at initialization. Therefore
`4.43613 + 0.04096 + 0.1 = 4.57709 NEAR` is only a strict code-plus-explicit-
headroom lower-bound illustration, **not** a deployable budget: account/state
overhead, transaction/receipt gas, registration storage, bootstrap backing,
monitoring contingency and price movement must be added from fresh measurements.

Before requesting authorization, prepare an integer-denominated budget with
separate, non-fungible rows for:

- account creation and code/state storage stake;
- deployment and initialization gas;
- retained operational/refund headroom;
- each pilot user's storage registration;
- bootstrap backing deposit;
- redemption payout (taken from backing, not extra backing);
- transaction/receipt gas contingency;
- an explicit total gross real-money ceiling and per-action limits.

Do not count storage stake, lender escrow, pending payouts or operational cash as
liquid FLOOR backing. Do not infer mainnet cost from faucet-funded testnet runs.

Official references: [deployment and initialization](https://docs.near.org/smart-contracts/release/deploy),
[storage staking](https://docs.near.org/protocol/storage/storage-staking), and
[RPC protocol configuration](https://docs.near.org/api/rpc/protocol).

