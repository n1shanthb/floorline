$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:CARGO_HOME = 'E:\toolchains\cargo'
$env:RUSTUP_HOME = 'E:\toolchains\rustup'
$env:CARGO_TARGET_DIR = 'E:\near-2\target'
$env:TEMP = 'E:\near-2\.tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
Remove-Item Env:RUSTFLAGS -ErrorAction SilentlyContinue
cargo fmt -- --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cargo test --offline --locked -- --nocapture 2>&1 | Tee-Object -FilePath 'E:\near-2\gate1-test-output.log'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
# near-sdk 5.30.1 requires on-chain host functions selected by cfg(near).
# This raw build is a compile check, not cargo-near's deployment validation.
$env:RUSTFLAGS = '--cfg near'
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract 2>&1 | Tee-Object -FilePath 'E:\near-2\gate1-build-output.log'
exit $LASTEXITCODE
