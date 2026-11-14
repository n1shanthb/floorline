param(
  [Parameter(Mandatory=$true)][string]$Config,
  [Parameter(Mandatory=$true)][string]$Artifact,
  [string]$Output = ""
)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
if ($cfg.networkId -ne 'mainnet') { throw 'Network isolation failed: networkId must equal mainnet' }
if ($cfg.contractAccountId -match 'testnet|REPLACE_|^$') { throw 'A new explicit mainnet contract account is required' }
if ($cfg.expectedWasmSha256 -ne '529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6') { throw 'Unexpected WASM hash' }
if ($cfg.expectedNearCodeHash -ne '6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9') { throw 'Unexpected NEAR code hash' }
if ($cfg.releaseDecision -ne 'GO') { throw 'Release decision is not GO; pilot preparation stopped' }
if ([Numerics.BigInteger]::Parse($cfg.pilotExposureYoctoNear) -le 0) { throw 'A reviewed positive exposure cap is required' }
$actual = (Get-FileHash -LiteralPath $Artifact -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $cfg.expectedWasmSha256) { throw 'Artifact hash mismatch' }
$plan = [ordered]@{
  mode = 'UNSIGNED_PLAN_ONLY'
  warning = 'This tool never signs, deploys, creates accounts, or moves funds.'
  network = $cfg.networkId
  contract = $cfg.contractAccountId
  artifact = (Resolve-Path $Artifact).Path
  artifact_sha256 = $actual
  initialization = $cfg.initialization
  exposure_cap_yocto = $cfg.pilotExposureYoctoNear
  ordered_actions = @(
    'Create and fund a new mainnet account under separately approved key custody',
    'Deploy the exact verified WASM and initialize atomically',
    'Verify code hash, state, access keys, metadata, parameters, storage and accounting',
    'Register the pilot holder using separately budgeted storage',
    'Perform bounded bootstrap issuance, redemption and claim withdrawal',
    'Reconcile every receipt and verify native balance >= local_required',
    'Enable the isolated mainnet frontend only after final receipt reconciliation'
  )
}
$json = $plan | ConvertTo-Json -Depth 8
if ($Output) { $json | Set-Content -LiteralPath $Output -Encoding utf8 }
$json

