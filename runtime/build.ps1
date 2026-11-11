$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'E:\near-2'
$env:CARGO_HOME='E:\toolchains\cargo'
$env:RUSTUP_HOME='E:\toolchains\rustup'
$env:CARGO_TARGET_DIR='E:\near-2\target'
$env:TEMP='E:\near-2\.tmp'
$env:TMP=$env:TEMP
$env:RUSTFLAGS='--cfg near'
New-Item -ItemType Directory -Force 'E:\near-2\runtime\artifacts' | Out-Null
cargo build --offline --locked --release --target wasm32-unknown-unknown --manifest-path fixtures\Cargo.toml
if($LASTEXITCODE -ne 0){throw 'Receiver fixture build failed'}
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract
if($LASTEXITCODE -ne 0){throw 'Normal contract build failed'}
Copy-Item 'target\wasm32-unknown-unknown\release\floorline_kill_test.wasm' 'runtime\artifacts\floorline.wasm'
# Deliberately insufficient (0.001 Tgas) callback gas for local fault injection.
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract,fault-injection
if($LASTEXITCODE -ne 0){throw 'Local fault artifact build failed'}
Copy-Item 'target\wasm32-unknown-unknown\release\floorline_kill_test.wasm' 'runtime\artifacts\floorline-fault.wasm'
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract
if($LASTEXITCODE -ne 0){throw 'Restoring normal contract artifact failed'}
