$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:CARGO_HOME='E:\toolchains\cargo'
$env:RUSTUP_HOME='E:\toolchains\rustup'
$env:CARGO_TARGET_DIR='E:\near-2\floorkit\contract\target'
$env:TEMP='E:\near-2\floorkit\contract\.tmp'
$env:TMP=$env:TEMP
$env:RUSTFLAGS='--cfg near'
New-Item -ItemType Directory -Force $env:TEMP,artifacts | Out-Null
if ((& rustc --version) -ne 'rustc 1.99.1 (58cf8f9c3 2026-10-13)') {throw 'Unexpected compiler'}
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract
if($LASTEXITCODE -ne 0){throw 'Normal WASM build failed'}
Copy-Item target/wasm32-unknown-unknown/release/floorkit_core.wasm artifacts/floorkit.wasm
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract,fault-callback
if($LASTEXITCODE -ne 0){throw 'Local fault WASM build failed'}
Copy-Item target/wasm32-unknown-unknown/release/floorkit_core.wasm artifacts/floorkit-fault.wasm
cargo build --offline --locked --release --target wasm32-unknown-unknown --manifest-path receiver/Cargo.toml
if($LASTEXITCODE -ne 0){throw 'Local receiver build failed'}
Copy-Item target/wasm32-unknown-unknown/release/floorkit_receiver.wasm artifacts/receiver.wasm
# Restore target's default artifact to the normal build as well.
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract
if($LASTEXITCODE -ne 0){throw 'Normal WASM restoration failed'}
Get-FileHash artifacts/*.wasm -Algorithm SHA256
