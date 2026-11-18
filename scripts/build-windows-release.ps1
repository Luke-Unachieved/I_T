# Build a development candidate. This does not launch the game or certify acceptance.
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
$ManifestPath = Join-Path $Destination '版本信息.json'
$Manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($Manifest.channel -ne 'development-candidate' -or $Manifest.edition -ne 'modern-trade-workshop') {
  throw 'Unexpected edition/channel. Do not package an unverified release.'
}
if ([IO.Path]::GetFileName($Manifest.entry) -ne $Manifest.entry -or [IO.Path]::GetExtension($Manifest.entry) -ne '.html') {
  throw 'Manifest entry must be a plain HTML filename within this candidate directory.'
}
$Expected = @($Manifest.entry, '版本信息.json', '先读我.txt')
$Actual = @(Get-ChildItem -LiteralPath $Destination -Force)
if ($Actual.Count -ne 3 -or @($Actual | Where-Object { $_.PSIsContainer -or $_.Name -notin $Expected }).Count) {
  throw 'Candidate folder must contain exactly the modern HTML, version manifest and reading guide.'
}
$Html = Get-Item -LiteralPath (Join-Path $Destination $Manifest.entry)
if ($Html.Length -ne $Manifest.bytes -or (Get-FileHash -LiteralPath $Html.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Manifest.sha256) {
  throw 'Candidate HTML does not match its version manifest.'
}
$ArchivePath = $Destination + '.zip'
if (Test-Path -LiteralPath $ArchivePath) { throw 'Archive destination already exists.' }
Compress-Archive -LiteralPath @($Actual.FullName) -DestinationPath $ArchivePath -CompressionLevel Optimal
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Archive = [IO.Compression.ZipFile]::OpenRead($ArchivePath)
try {
  if ($Archive.Entries.Count -ne 3 -or @($Archive.Entries | Where-Object { $_.FullName -notin $Expected }).Count) {
    throw 'Archive contains an unexpected file or path.'
  }
  foreach ($Entry in $Archive.Entries) {
    $Original = Get-Item -LiteralPath (Join-Path $Destination $Entry.FullName)
    if ($Entry.Length -ne $Original.Length) { throw 'Archived file size differs from the candidate.' }
    $Stream = $Entry.Open()
    $Sha = [Security.Cryptography.SHA256]::Create()
    try { $Digest = [BitConverter]::ToString($Sha.ComputeHash($Stream)).Replace('-', '').ToLowerInvariant() }
    finally { $Sha.Dispose(); $Stream.Dispose() }
    if ($Digest -ne (Get-FileHash -LiteralPath $Original.FullName -Algorithm SHA256).Hash.ToLowerInvariant()) {
      throw 'Archived file bytes differ from the candidate.'
    }
  }
} finally { $Archive.Dispose() }
$ArchiveHash = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output ('Verified candidate archive: ' + $ArchivePath)
Write-Output ('Archive SHA-256: ' + $ArchiveHash)
Get-ChildItem -LiteralPath $Destination -File | Select-Object Name,Length
Write-Output 'Packaging only. This does not certify Windows playtesting or release acceptance.'
