param([ValidateSet('dev','typecheck','lint','test','test:e2e','build','preview','evidence')][string]$Task='dev')
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:TEMP='E:\near-2\.tmp'
$env:TMP=$env:TEMP
$env:npm_config_cache='E:\near-2\.npm-cache'
$env:PLAYWRIGHT_BROWSERS_PATH='E:\near-2\.tmp\playwright'
npm run $Task
exit $LASTEXITCODE
