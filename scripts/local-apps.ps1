param(
  [Parameter(Position = 0)]
  [ValidateSet('start', 'stop', 'status')]
  [string]$Action = 'status',

  [Parameter(Position = 1)]
  [ValidateSet('development', 'staging', 'production')]
  [string]$Environment = 'development'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.$Environment.local"
$runDir = Join-Path $repoRoot ".tmp\local-apps\$Environment"
$ports = [ordered]@{ api = 8787 }

function Import-LocalEnvironment {
  if (-not (Test-Path -LiteralPath $envFile)) { throw "Missing local environment file: $envFile" }
  foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*([^#][^=]*)=(.*)$') {
      [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2], 'Process')
    }
  }
  $env:MOONWITNESS_ENV = $Environment
  $env:NODE_ENV = if ($Environment -eq 'production') { 'production' } else { 'development' }
  $env:HOST = '127.0.0.1'
  $env:PORT = [string]$ports.api
}

function Get-Listeners {
  @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in @($ports.Values) } |
    Select-Object LocalAddress, LocalPort, OwningProcess |
    Sort-Object LocalPort)
}

function Get-AuthorizedHealth {
  $uri = "http://127.0.0.1:$($ports.api)/api/v1/health"
  $health = Invoke-RestMethod -Uri $uri -TimeoutSec 10
  if ($health.ok) { return $health }
  if ($health.status -ne 'ok' -or -not $env:MOONWITNESS_ADMIN_USERNAME -or -not $env:MOONWITNESS_ADMIN_PASSWORD) { return $health }
  $login = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:$($ports.api)/api/v1/auth/login" -Headers @{ 'X-MW-Auth-Mode' = 'bearer' } -ContentType 'application/json' -Body (@{
    username = $env:MOONWITNESS_ADMIN_USERNAME
    password = $env:MOONWITNESS_ADMIN_PASSWORD
  } | ConvertTo-Json)
  $token = if ($login.accessToken) { $login.accessToken } else { $login.token }
  if (-not $token) { throw 'Administrative health authentication did not return an access token.' }
  Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 10
}

function Stop-LocalApps {
  $listeners = Get-Listeners
  $processIds = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($processId in $processIds) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Listeners).Count -gt 0 -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
  [pscustomobject]@{ ok = (Get-Listeners).Count -eq 0; action = 'stop'; environment = $Environment; stoppedProcesses = $processIds } | ConvertTo-Json -Depth 4
}

function Get-LocalStatus {
  Import-LocalEnvironment
  $listeners = Get-Listeners
  $health = $null
  if ($listeners.LocalPort -contains $ports.api) {
    try { $health = Get-AuthorizedHealth } catch { $health = @{ ok = $false; error = $_.Exception.Message } }
  }
  [pscustomobject]@{ ok = ($listeners.LocalPort -contains $ports.api) -and [bool]$health.ok; action = 'status'; requestedEnvironment = $Environment; listeners = $listeners; health = $health } | ConvertTo-Json -Depth 8
}

function Start-LocalApps {
  Import-LocalEnvironment
  $occupied = Get-Listeners
  if ($occupied.Count -gt 0) { throw "MoonWitness API port is already in use. Run 'npm run local:stop' before switching environments." }
  $required = @(Join-Path $repoRoot 'apps\api\dist\apps\api\src\server.js')
  foreach ($path in $required) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing build output: $path. Build the API first." }
  }
  New-Item -ItemType Directory -Force -Path $runDir | Out-Null
  $common = @{ WorkingDirectory = $repoRoot; WindowStyle = 'Hidden'; PassThru = $true }
  $api = Start-Process @common -FilePath 'npm.cmd' -ArgumentList @('--prefix', 'apps/api', 'start') -RedirectStandardOutput (Join-Path $runDir 'api.out.log') -RedirectStandardError (Join-Path $runDir 'api.err.log')
  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Listeners).Count -lt 1 -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
  $listeners = Get-Listeners
  if ($listeners.Count -lt 1) { throw "API failed to start. Inspect logs under $runDir." }
  $health = Get-AuthorizedHealth
  [pscustomobject]@{
    ok = [bool]$health.ok
    action = 'start'
    environment = $Environment
    urls = @{ api = "http://127.0.0.1:$($ports.api)" }
    launchers = @{ api = $api.Id }
    listeners = $listeners
    health = $health
  } | ConvertTo-Json -Depth 8
}

switch ($Action) {
  'start' { Start-LocalApps }
  'stop' { Stop-LocalApps }
  'status' { Get-LocalStatus }
}
