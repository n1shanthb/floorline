# V2 economic parity

V2 copies the v1 economic engine and wide-arithmetic module byte-for-byte:

- `engine.rs`: `0a75c8f2c5ae8089245c4e83991a4fca4278a54b49fc140a83e07c361bb37e48`
- `math.rs`: `abef6d3008f77fee730451bc049b4c7dd0ef5207019930342ee7fe99d085ad2c`

The copied v1 host suite ran against the v2 crate: 16/16 passed, including the
10,000 randomized-sequence test, maximum-value curve comparison, positive-supply
nondilution, zero-supply restart, overlapping redemptions, storage segregation,
locked collateral, NFT transfer/repayment/default exclusivity and dispatch-failure
accounting.

Runtime parity demonstrated issuance, pro-rata redemption, funded claim payout,
overlapping payouts, storage withdrawal, lender-funded offer, collateral lock,
Carol-to-Dave NFT transfer, current-owner repayment and double-settlement rejection.

Intentional differences are confined to callback bookkeeping and recovery:
dispatch timestamps, quarantine views, per-obligation known-failure balance
checks, owner-only unknown-as-paid cleanup and a read-only refund view. The
production operational headroom remains 0.1 NEAR. No issuance, redemption curve,
backing, supply, collateral or loan settlement formula changed.

V1 and V2 contract storage layouts are not compatible. V2 is a fresh-deployment
prototype, not an in-place v1 upgrade or migration. No migration was implemented
or tested.

