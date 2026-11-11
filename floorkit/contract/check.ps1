$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:CARGO_HOME='E:\toolchains\cargo'
$env:RUSTUP_HOME='E:\toolchains\rustup'
$env:CARGO_TARGET_DIR='E:\near-2\floorkit\contract\target'
$env:TEMP='E:\near-2\floorkit\contract\.tmp'
$env:TMP=$env:TEMP
$env:PYTHONDONTWRITEBYTECODE='1'
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
$version = (& rustc --version)
if ($version -ne 'rustc 1.99.1 (58cf8f9c3 2026-10-13)') { throw "Unexpected compiler: $version" }
cargo fmt --check
if($LASTEXITCODE -ne 0){throw 'Formatting check failed'}
cargo test --offline --locked
if($LASTEXITCODE -ne 0){throw 'Unit tests failed'}
cargo build --offline --locked --example parity
if($LASTEXITCODE -ne 0){throw 'Parity runner build failed'}
python -B tools/parity.py
if($LASTEXITCODE -ne 0){throw 'Economic parity failed'}
