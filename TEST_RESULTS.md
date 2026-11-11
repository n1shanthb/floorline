# Observed execution — November 10, 2026

Environment: rustc 1.99.1; cargo 1.99.1; Windows MSVC host; wasm32-unknown-unknown target; near-sdk 5.30.1.

`cargo test --offline -- --nocapture`:

```text
running 5 tests
test tests::extremes ... ok
test tests::counterexamples ... ok
test tests::carol_dave ... ok
test tests::overlapping_and_defaults ... ok
10000 seeds x 128 operations; rejected operations=360988; invariant failures=0
test tests::randomized_10000_sequences ... ok
test result: ok. 5 passed; 0 failed; 0 ignored
```

Deterministic seeds 1 through 10000; no failing seeds. Invalid operations are expected and checked for atomic rollback. These are host reference-model tests, not near-sdk runtime tests.

`RUSTFLAGS='--cfg near' cargo build --release --target wasm32-unknown-unknown --features contract` compiled successfully. Artifact: `target/wasm32-unknown-unknown/release/floorline_kill_test.wasm`. Raw compilation does not establish deployability or runtime correctness.

The first host attempt incorrectly included near-sdk as a host dependency and failed its environment guard; Cargo.toml now restricts SDK dependencies to WASM. An initial WASM attempt required correction of ambiguous `.into()` arguments. On-chain SDK mode additionally required four missing crates; those were downloaded into E:\toolchains\cargo after sandbox DNS access failed. All build output and explicitly configured temp files are on E:. No testnet deployment or DAO call was executed.

See KILL_TEST.md for missing gates and the recommendation.
