# V2 mainnet gate

## Verdict

- **V2 DESIGN: SOUND** for its narrow fail-closed specification
- **DOUBLE-PAYMENT SAFETY: PASS**
- **RECOVERY AVAILABILITY: FAIL** for genuinely unknown failed transfers
- **SANDBOX RUNTIME: PASS**
- **INDEPENDENT AUDIT: NOT COMPLETED**
- **MAINNET LAUNCH: NO-GO**

V2 removes the unjustified global-InFlight coupling from known-failure recovery,
adds bounded owner-controlled cleanup and passes economic plus real sandbox gates.
It deliberately does not restore or resend a genuinely unknown payout, because
doing so permissionlessly can double-pay. A beneficiary whose transfer truly
failed and whose callback was lost still lacks guaranteed recovery.

Mainnet also remains blocked by independent audit, FullAccess custody/upgrade
policy, no pause/cap/allowlist, incomplete production indexing/monitoring and a
zero authorized real-money budget. The earlier funding lower bound remains only
a planning calculation; V2's 457,591-byte code alone implies 4.57591 NEAR storage
stake at the recorded 0.00001 NEAR/byte protocol price, before state, the 4,096-
byte margin, 0.1 NEAR headroom, gas, registration, backing and contingency.

The strongest next path is either: (a) accept and prominently specify fail-closed
unknown availability, then obtain an independent audit and explicit launch-risk
decision; or (b) design a protocol-verifiable receipt proof or disclosed trusted
threshold recovery authority, with new economic, adversarial and governance
gates. Neither path is cleared here.

