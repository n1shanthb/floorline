$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'E:\near-2'
$env:TEMP='E:\near-2\.tmp'
$env:TMP=$env:TEMP
$env:CARGO_HOME='E:\toolchains\cargo'
$env:RUSTUP_HOME='E:\toolchains\rustup'
$env:CARGO_TARGET_DIR='E:\near-2\target'
$env:npm_config_cache='E:\near-2\.npm-cache'
Remove-Item Env:RUSTFLAGS -ErrorAction SilentlyContinue
cargo test --offline --locked --test runtime_reference
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
& 'E:\near-2\runtime\build.ps1'
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
node 'E:\near-2\runtime\test.mjs' 2>&1 | Tee-Object -FilePath 'E:\near-2\runtime\evidence\console.log'
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
node 'E:\near-2\runtime\verify-views.mjs'
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
node 'E:\near-2\runtime\summarize.mjs'
exit $LASTEXITCODE
