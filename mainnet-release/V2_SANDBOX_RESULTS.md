# V2 sandbox results

Final run: **PASS**, local NEAR sandbox 2.14.0, protocol 88, chain
`test-chain-SabJV`-style disposable local network. No testnet/mainnet transaction
or production key was used.

Normal candidate:

- SHA-256 `2325abb1230509e4f9c96acc842f25fca8482682096910b3f5e8df0a3d3dc6fc`
- NEAR code hash `3NCaxojRRbuJLkGmpmAJnNiJd7SMqqPbrGee8t15eCYb`
- 457,591 bytes

Fault/short-quarantine artifact (never deploy):

- SHA-256 `e54ef95d98a7653812f44e5e68325be771c5abe179b09cdb334a5a3ecc77277b`
- NEAR code hash `GS8D4GXdpdjrRbvvyFUwvJnAMNxz1Zmdx7yxA7pes2bc`
- callback gas deliberately 0.001 Tgas, quarantine five seconds and operational
  headroom 0.01 NEAR solely to reach failure boundaries quickly.

## Executed cases

Eight scenario groups passed with zero final failures:

1. Issuance, redemption, actual payout and duplicate-withdraw rejection.
2. Two overlapping payouts with `account_balance >= local_required` afterward.
3. Lender-funded loan, collateral, NFT transfer, owner repayment and terminal
   double-repay/default rejection.
4. Successful storage refund releases temporary record.
5. Receiver account deletion causes a real failed native transfer and executed
   Failure callback; recreated same local identity restores only its claim and
   successfully retries it.
6. Successful native transfer plus callback gas exhaustion leaves InFlight;
   duplicate withdrawal, outsider cleanup and pre-quarantine cleanup reject;
   owner acknowledgement sends no second payout and terminal duplicate rejects.
7. Another user creates/dispatches a payout while the first is unknown; local
   solvency remains true.
8. Eight lost storage-refund callbacks fill the reduced fault allowance; the
   ninth growth attempt rejects, wrong-owner cleanup rejects, receiver cleanup
   releases every record, and a new refund can be dispatched afterward.

Raw evidence is in `v2/evidence/sandbox-results.json` and
`v2/evidence/sandbox-console.log`. The JSON contains each root transaction hash,
all receipt IDs/statuses, signer/receiver public IDs, total gas and receiver
storage deltas; sandbox private keys are deliberately omitted.

Measured totals include: normal successful `withdraw_claim` up to about 5.30
Tgas; `retry_failed_claim` 2.13 Tgas; unknown-claim finalization 1.90–2.12 Tgas;
unknown-refund finalization 1.94–2.10 Tgas and -122 bytes on successful record
removal; `redeem` 2.81–2.82 Tgas and +149–163 bytes; loan acceptance 3.29 Tgas
and +71 bytes. These are local measurements, not worst-case mainnet budgets.

Two development runs correctly failed at harness assumptions before the final
evidence run: a one-second quarantine elapsed before an intended early rejection,
and callback failure was initially mistaken for parent-call rollback. The final
test uses a five-second boundary and classifies persisted refunds by the actual
`refund_storage` delta.

