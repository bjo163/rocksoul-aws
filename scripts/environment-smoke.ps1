param(
  [Parameter(Position = 0)]
  [ValidateSet('development', 'staging')]
  [string]$Environment = 'development'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.$Environment.local"
if (-not (Test-Path -LiteralPath $envFile)) { throw "Missing environment file: $envFile" }
foreach ($line in Get-Content -LiteralPath $envFile) {
  if ($line -match '^\s*([^#][^=]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2], 'Process')
  }
}

$base = 'http://127.0.0.1:8787'
function Invoke-MoonWitnessApi {
  param([string]$Method, [string]$Path, [object]$Body = $null, [hashtable]$Headers = @{})
  $request = @{ Method = $Method; Uri = "$base$Path"; Headers = $Headers; TimeoutSec = 30 }
  if ($null -ne $Body) {
    $request.ContentType = 'application/json'
    $request.Body = $Body | ConvertTo-Json -Depth 30
  }
  Invoke-RestMethod @request
}

$health = Invoke-MoonWitnessApi -Method GET -Path '/api/v1/health'
if (-not $health.ok -or $health.environment -ne $Environment -or $health.database -ne $env:PGDATABASE) {
  throw "Health/environment mismatch. Expected $Environment/$env:PGDATABASE."
}

$login = Invoke-MoonWitnessApi -Method POST -Path '/api/v1/auth/login' -Body @{
  username = $env:MOONWITNESS_ADMIN_USERNAME
  password = $env:MOONWITNESS_ADMIN_PASSWORD
}
if (-not $login.token) { throw 'Admin login did not return a token.' }
$headers = @{ Authorization = "Bearer $($login.token)" }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddHHmmssfff')
$caseId = "CERT-$($Environment.ToUpperInvariant())-$stamp"
$evidenceId = "$caseId-EVD-1"

$observed = Invoke-MoonWitnessApi -Method POST -Path '/api/v1/observe' -Headers $headers -Body @{
  entityId = $caseId
  payload = @{ text = "Environment certification observation for $Environment" }
}
$evidence = Invoke-MoonWitnessApi -Method POST -Path "/api/v1/resource/$caseId/evidence" -Headers $headers -Body @{
  evidenceId = $evidenceId
  sourceType = 'SYSTEM_TEST'
  reference = "LOCAL:${Environment}:$stamp"
  status = 'VERIFIED'
  confidence = 1
  payload = @{ purpose = 'environment certification'; environment = $Environment }
}
$analysis = Invoke-MoonWitnessApi -Method POST -Path '/api/v1/analyze' -Headers $headers -Body @{
  caseId = $caseId
  text = "Environment certification observation for $Environment"
}
$review = Invoke-MoonWitnessApi -Method POST -Path '/api/v1/reviews' -Headers $headers -Body @{
  targetId = $caseId
  gateDecision = 'BLOCK_ADVERSE_ACTION'
  evidenceRefs = @($evidenceId)
}
$assigned = Invoke-MoonWitnessApi -Method POST -Path "/api/v1/reviews/$($review.reviewId)/transition" -Headers $headers -Body @{
  status = 'ASSIGNED'
  assigneeId = $login.user.userId
}
$acknowledged = Invoke-MoonWitnessApi -Method POST -Path "/api/v1/reviews/$($review.reviewId)/transition" -Headers $headers -Body @{ status = 'ACKNOWLEDGED' }
$disposed = Invoke-MoonWitnessApi -Method POST -Path "/api/v1/reviews/$($review.reviewId)/transition" -Headers $headers -Body @{
  status = 'DISPOSED'
  disposition = 'UPHOLD_GATE'
  rationale = 'Environment certification keeps the safety gate intact.'
}
$witness = Invoke-MoonWitnessApi -Method GET -Path '/api/v1/witness/status' -Headers $headers

[pscustomobject]@{
  ok = $true
  environment = $Environment
  database = $health.database
  release = $health.release
  admin = $login.user.username
  caseId = $caseId
  observed = [bool]$observed
  evidenceId = $evidence.evidence.evidenceId
  analysisStatus = $analysis.status
  reviewId = $review.reviewId
  reviewTransitions = @($assigned.status, $acknowledged.status, $disposed.status)
  disposition = $disposed.disposition
  witnessNodes = $witness.nodes
  witnessRoot = $witness.root
} | ConvertTo-Json -Depth 8
