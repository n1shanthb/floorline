$ErrorActionPreference='Stop'
$env:SANDBOX_RPC='http://127.0.0.1:3032'
node (Join-Path $PSScriptRoot 'runtime/test.mjs')
if($LASTEXITCODE -ne 0){throw 'Architecture experiment failed'}
