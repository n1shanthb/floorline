$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'E:\near-2'
$env:CARGO_HOME='E:\toolchains\cargo'
$env:RUSTUP_HOME='E:\toolchains\rustup'
$env:CARGO_TARGET_DIR='E:\near-2\product-review\rebuild-target'
$env:TEMP='E:\near-2\.tmp'
$env:TMP=$env:TEMP
$env:RUSTFLAGS='--cfg near'
$approved='E:\near-2\runtime\artifacts\floorline.wasm'
$before=(Get-FileHash -LiteralPath $approved -Algorithm SHA256).Hash.ToLowerInvariant()
cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract
if($LASTEXITCODE -ne 0){throw 'Isolated build failed'}
$rebuilt='E:\near-2\product-review\rebuild-target\wasm32-unknown-unknown\release\floorline_kill_test.wasm'
$after=(Get-FileHash -LiteralPath $approved -Algorithm SHA256).Hash.ToLowerInvariant()
$result=[ordered]@{compiler=(& rustc --version);approved_before=$before;approved_after=$after;rebuilt_sha256=(Get-FileHash -LiteralPath $rebuilt -Algorithm SHA256).Hash.ToLowerInvariant();approved_artifact_unchanged=($before -eq $after)}
$result['byte_for_byte_match']=($before -eq $result.rebuilt_sha256)
$result | ConvertTo-Json | Set-Content -LiteralPath product-review/REPRODUCIBLE_BUILD.json -Encoding utf8
if(-not $result.approved_artifact_unchanged){throw 'Approved artifact changed'}
if(-not $result.byte_for_byte_match){throw 'Reproducibility is not established: preserve and review mismatch'}
