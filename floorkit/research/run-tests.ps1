param([int]$Sequences=10000,[int]$Steps=96)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:PYTHONDONTWRITEBYTECODE='1'
$env:TEMP='E:\near-2\.tmp'
$env:TMP=$env:TEMP
python -B rejected_designs.py
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
python -B verify_extras.py
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
python -B run_tests.py --sequences $Sequences --steps $Steps
exit $LASTEXITCODE
