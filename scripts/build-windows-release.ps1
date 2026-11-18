# Run only after development is ready for packaging/acceptance.
$ErrorActionPreference = 'Stop'
$SourceRoot = Split-Path $PSScriptRoot -Parent
$WorkspaceRoot = Split-Path $SourceRoot -Parent
if ((Split-Path $SourceRoot -Leaf) -ne 'source' -or (Split-Path $WorkspaceRoot -Leaf) -ne 'TradeGame') {
  throw 'Use the dedicated TradeGame\source checkout; do not guess another output directory.'
}
$env:TEMP = Join-Path $WorkspaceRoot 'tmp'
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $WorkspaceRoot 'cache\npm'
$OutputRoot = Join-Path $WorkspaceRoot 'build'
$LogRoot = Join-Path $WorkspaceRoot 'logs'
foreach ($dir in @($env:TEMP,$OutputRoot,$LogRoot)) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
$BuildName = 'modern-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
$Destination = Join-Path $OutputRoot $BuildName
if (Test-Path -LiteralPath $Destination) { throw 'Build destination already exists.' }
$LogFile = Join-Path $LogRoot ($BuildName + '.log')
$Node = (Get-Command node -ErrorAction Stop).Source
& $Node (Join-Path $PSScriptRoot 'build-deal-standalone.mjs') $Destination 2>&1 | Tee-Object -FilePath $LogFile
if ($LASTEXITCODE -ne 0) { throw "Packaging failed. See $LogFile" }
Get-ChildItem -LiteralPath $Destination -File | Select-Object Name,Length
Write-Output 'Packaging only. This does not certify Windows playtesting or release acceptance.'
