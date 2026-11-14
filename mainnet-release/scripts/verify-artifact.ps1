param(
  [string]$ApprovedArtifact,
  [string]$Output = ""
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (-not $ApprovedArtifact) {
  $ApprovedArtifact = Join-Path $repo 'runtime\artifacts\floorline.wasm'
}
if (-not (Test-Path -LiteralPath $ApprovedArtifact -PathType Leaf)) {
  throw "Approved artifact not found: $ApprovedArtifact"
}
$env:CARGO_HOME = 'E:\toolchains\cargo'
$env:RUSTUP_HOME = 'E:\toolchains\rustup'
$env:CARGO_TARGET_DIR = Join-Path $repo '.build\mainnet-release-wasm'
$env:TEMP = Join-Path $repo '.tmp'
$env:TMP = $env:TEMP
$env:RUSTFLAGS = '--cfg near'
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
Push-Location $repo
try {
  cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract
  if ($LASTEXITCODE -ne 0) { throw 'Reproducible build failed' }
} finally {
  Pop-Location
}
$rebuilt = Join-Path $env:CARGO_TARGET_DIR 'wasm32-unknown-unknown\release\floorline_kill_test.wasm'
$approvedHash = (Get-FileHash -LiteralPath $ApprovedArtifact -Algorithm SHA256).Hash.ToLowerInvariant()
$rebuiltHash = (Get-FileHash -LiteralPath $rebuilt -Algorithm SHA256).Hash.ToLowerInvariant()
$approvedBytes = [IO.File]::ReadAllBytes($ApprovedArtifact)
$rebuiltBytes = [IO.File]::ReadAllBytes($rebuilt)
$same = $approvedBytes.Length -eq $rebuiltBytes.Length -and -not (Compare-Object $approvedBytes $rebuiltBytes)
$result = [ordered]@{
  generated_at_utc = [DateTime]::UtcNow.ToString('o')
  source_commit = (git -C $repo rev-parse HEAD)
  rust = (& rustc --version)
  cargo_lock_version = ((Select-String -LiteralPath (Join-Path $repo 'Cargo.lock') -Pattern '^version = (\d+)$' | Select-Object -First 1).Matches.Groups[1].Value)
  near_sdk_version = '5.30.1'
  command = 'cargo build --offline --locked --release --target wasm32-unknown-unknown --features contract (RUSTFLAGS=--cfg near)'
  approved_path = (Resolve-Path $ApprovedArtifact).Path
  approved_size = $approvedBytes.Length
  approved_sha256 = $approvedHash
  rebuilt_size = $rebuiltBytes.Length
  rebuilt_sha256 = $rebuiltHash
  expected_sha256 = '529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6'
  expected_near_code_hash = '6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9'
  byte_for_byte_match = [bool]$same
  release_check_passed = [bool]($same -and $approvedHash -eq '529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6')
}
$json = $result | ConvertTo-Json -Depth 5
if ($Output) { $json | Set-Content -LiteralPath $Output -Encoding utf8 }
$json
if (-not $result.release_check_passed) { throw 'Artifact release check failed' }

