# Public testnet deployment plan — authorization not yet granted

No step below has been executed on public testnet. Local sandbox account IDs/hashes are not public evidence. No real signer, wallet or project DAO is assumed to exist. Do not create/fund wallets, deploy or remove keys without separate authorization. Keep tooling, caches, signer storage and artifacts on E:; never request or include private keys in chat or documentation.

## Accounts and budget

Required roles: deployment/controller signer, Floorline contract account, Alice issuer, Bob redeemer, Carol borrower, Dave NFT recipient/repayer, lender, and two or three genuine project council signers. Roles may share a funded test operator for setup, but Carol, Dave and lender must be distinct contract identities in the demonstration. DAO funds must actually be controlled by the project council. Choose actual unused account names only after authorization; this plan invents no account IDs.

Contract funding basis: uploaded WASM bytes plus measured constant-state bytes, multiplied by live protocol storage_byte_cost, plus 4096 bytes and 0.1 NEAR operational headroom. Read GATE2_RESULTS.md and the evidence manifest for the exact tested artifact size and stake. **Budget 8 testnet NEAR provisionally** for the current roughly 0.45 MB build, subject to the exact live calculation and at least 0.1 NEAR unallocated gas contingency. Initialization checks actual funds. The local test used 20 NEAR; that is a conservative sandbox allocation, not a required public subsidy or treasury backing.

Suggested scaled demonstration funding, excluding DAO creation: Alice 3 NEAR (2 issuance, 0.05 prepaid storage, gas/contingency); Bob 0.25 NEAR (storage/gas; FLOOR is transferred from Alice); Carol 0.25 NEAR (storage/gas; collateral transferred from Alice and principal supplied by lender); Dave 0.5 NEAR (0.11 fixed debt, storage/gas); lender 0.5 NEAR (two 0.1 offers, storage/gas). Values are test budgets, not promised minimums. Lender offer principal must never be taken from the contract deployment balance or L.

DAO contribution: 0.1 NEAR initially, plus its proposal bonds, account storage and gas. Creator needs `factory-required deposit + operating cushion + planned contribution`; proposers need the actual get_policy proposal_bond plus gas. Default source currently has a 1 NEAR bond, but do not assume it for an existing deployment. The current factory source uses global contract code and a 0.01 NEAR minimum registration/config deposit; older deployed Sputnik factories may require local WASM storage and substantially more. **Reserve 10 NEAR as a provisional DAO creation budget**, then replace that number with a quote based on the actual factory code/version and storage model. Do not treat the 0.01 source minimum as verified for sputnikv2.testnet. Council members need at least 0.1 NEAR gas each, and whichever member proposes needs the bond separately. All budgets require funded-account authorization and a verified live gas price.

## Reproducible contract preparation

1. Run the locked host/reference tests and `runtime/build.ps1`, verify normal and fault WASM hashes differ, and select only `runtime/artifacts/floorline.wasm`. Never use floorline-fault.wasm or the open receiver fixture as the product. Inspect runtime/evidence/runtime.json and all expected failures.
2. Record Rust/SDK versions, source/lockfile hash, WASM SHA-256, artifact byte size and live storage requirements. Verify target protocol supports the SDK's required host functions. This raw build is not yet a cargo-near reproducible-container attestation; produce one before making reproducibility claims beyond the recorded toolchain/hash.
3. After authorization, create/select actual funded accounts and deploy the normal artifact. Initialize with `{ "tax_bps":2000, "issuance_numerator":"1", "issuance_denominator":"1" }`, no attached deposit; both FLOOR/NEAR use 24 decimal atomic units. Record deployment and initialization receipts and verify code hash/configuration via RPC.
4. Read accounting before any deposit. L=T=0; initial funding is operational/unallocated, not backing. Register accounts with measured prepaid storage. Confirm token metadata, one-yocto transfer requirements, and minimum gas. Attach 150 Tgas for ordinary protected transfer-call/withdraw methods (at least 110 is enforced); use 300 Tgas for end-to-end demonstration transactions that include fixture/DAO orchestration. No frontend is needed for evidence.
5. Keep deployment keys under the current instruction. Clearly mark the deployment mutable; never market it as ownerless. Any later key-removal/upgrade policy needs a separately reviewed and authorized step.

## Exact Sputnik preparation procedure

Source research supports the following interfaces, not the identity/version of any public deployment:

- [Factory create](https://github.com/near-daos/sputnik-dao-contract/blob/main/sputnikdao-factory2/src/lib.rs): `create(name, args)` creates a distinct subaccount and initializes it; args is base64-encoded JSON.
- [DAO initialization](https://github.com/near-daos/sputnik-dao-contract/blob/main/sputnikdao2/src/lib.rs): `new(config,policy)`; the policy may be an initial council array for the supported version.
- [Proposal actions](https://github.com/near-daos/sputnik-dao-contract/blob/main/sputnikdao2/src/proposals.rs): FunctionCall includes actual receiver/actions/attached deposit/gas. add_proposal and act_proposal are DAO methods.
- [Policy](https://github.com/near-daos/sputnik-dao-contract/blob/main/sputnikdao2/src/policy.rs): read actual roles, permissions, threshold, bond and period before proposing or voting. A ratio threshold represents strict majority behavior in the reviewed source; verify the deployed rules.

Before any action: query the candidate factory account/code hash, confirm its ABI/source version and available creation code hash, inspect its creation economics, and select an unused name. sputnikv2.testnet is a **factory candidate**, not the project's DAO and not verified by this gate. Do not call it as if it were a council-governed project account. If factory identity/code cannot be verified, stop; deploying a new factory is outside current scope.

Construct initialization JSON using actual authorized council IDs:

```json
{"config":{"name":"Floorline community","purpose":"Allocate community-controlled NEAR into verifiable Floorline backing","metadata":""},"policy":["ACTUAL_COUNCIL_1","ACTUAL_COUNCIL_2","ACTUAL_COUNCIL_3"]}
```

Base64 encode the exact UTF-8 JSON, then invoke the verified factory's `create` with `{ "name":"ACTUAL_UNUSED_DAO_NAME", "args":"BASE64_INIT_JSON" }` and its verified creation deposit. Inspect all receipts and factory return value. Derive the actual created account from the creation result; query get_config, get_policy and code hash. Require a real majority-controlled policy (for example two of three project members), not a unilateral disguised council. Policy/version differences require adjusting JSON, not blindly running this template.

After the DAO has funds, submit `add_proposal` to the **actual DAO**, attaching its current proposal_bond. Exact contribution proposal structure:

```json
{"proposal":{"description":"Allocate 0.1 NEAR of community funds to Floorline redemption backing, without minting tokens","kind":{"FunctionCall":{"receiver_id":"ACTUAL_FLOORLINE_ACCOUNT","actions":[{"method_name":"contribute","args":"e30=","deposit":"100000000000000000000000","gas":"30000000000000"}]}}}}
```

`e30=` is UTF-8 `{}` in base64. Capture the returned proposal ID; authorized council members call `act_proposal` with `{ "id":ACTUAL_PROPOSAL_ID, "action":"VoteApprove" }` using the actual deployed method's deposit/gas requirements. Read get_proposal and terminal execution receipts: approved status alone is not enough. Verify the DAO actually spent 0.1 NEAR, Floorline L rose by exactly that amount, T stayed unchanged, and donor in the event is the DAO account. A local DAO-style fixture test is not this governance demonstration.

## Minimum demonstration and evidence

Record issuance, Alice->Bob FLOOR transfer, Bob's taxed redemption and successful native claim withdrawal; reject a dilutive issuance after backing grows. Separately record lender-funded offer, Carol collateral lock and real loan NFT, Carol->Dave NFT transfer, rejected old-owner repayment, Dave's exact repayment, Dave's recovered FLOOR and lender's native claim withdrawal. Use a distinct short-duration loan for actual chain-time default and lender collateral recovery. Then execute the real DAO contribution above. No public time override, oracle, refinance, market, factory implementation or frontend.

For each transaction store network, actual accounts, code/source hash, method/args/deposit, transaction hash, receipt IDs/statuses, gas, storage delta, before/after A/L/T/locked/available balances/claim buckets/storage reserves, and a **verified** public explorer link such as the actual transaction URL on the selected testnet explorer. Never generate hashes or links for unexecuted steps. Record proposal ID, votes and terminal FunctionCall receipt. Keep private material out of the manifest.

Deadline supplied by the user: November 14, 2026, 23:59 UTC (November 15, 05:29 Asia/Calcutta). All three tracks remain required. Passing local receipts justifies a controlled public-testnet request; it does not establish prize eligibility, an audit, ownerlessness, financial guarantees beyond admitted-transition backing mathematics, or permission to accept public funds.
