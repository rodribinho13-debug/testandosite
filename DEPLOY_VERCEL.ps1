# =============================================================================
# PROJECT.IA - DEPLOY VERCEL (Rodrigo)
# Repo GitHub: https://github.com/rodribinho13-debug/testandosite
#
# USO:
#   cd "C:\Users\Usuario\Downloads\SITE INTRANET"
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\DEPLOY_VERCEL.ps1              (deploy de PRODUCAO)
#   .\DEPLOY_VERCEL.ps1 -Preview     (deploy de preview, URL temporaria)
#   .\DEPLOY_VERCEL.ps1 -Logout      (deslogar a conta Vercel)
# =============================================================================

param(
  [switch]$Preview,
  [switch]$Logout,
  [string]$ProjectName = "testandosite"
)

# IMPORTANTE: Continue (nao Stop) porque Vercel CLI escreve notas no stderr
# que nao sao erros reais. Vamos checar $LASTEXITCODE manualmente.
$ErrorActionPreference = "Continue"

# Desabilita aviso de telemetria do Vercel
$env:VERCEL_TELEMETRY_DISABLED = "1"

function Step($msg) { Write-Host ""; Write-Host ("==>  " + $msg) -ForegroundColor Cyan }
function Ok($msg)   { Write-Host ("    [OK]  " + $msg) -ForegroundColor Green }
function Warn($msg) { Write-Host ("    [!]   " + $msg) -ForegroundColor Yellow }
function Die($msg)  { Write-Host ("    [X]   " + $msg) -ForegroundColor Red; exit 1 }

# Helper: roda comando e ignora stderr (caso seja so warning/info)
function RunQuiet($cmd, [string[]]$cmdArgs) {
  $out = & $cmd @cmdArgs 2>&1 | Out-String
  return @{ Output = $out.Trim(); ExitCode = $LASTEXITCODE }
}

# --- 0. Sanity ---
Step "Validando ambiente"

if (-not (Test-Path "hydrostec_v9.html")) {
  Die "hydrostec_v9.html nao encontrado. Voce esta na pasta certa?"
}

if (-not (Test-Path ".vercelignore")) {
  Warn ".vercelignore nao encontrado - tudo da pasta vai pro Vercel."
}
Ok "Pasta correta"

# --- 1. Node.js ---
Step "Verificando Node.js"

$nodeCheck = RunQuiet "node" @("--version")
if ($nodeCheck.ExitCode -ne 0) {
  Write-Host ""
  Die "Node.js nao encontrado. Instale em https://nodejs.org/ (LTS) e reabra o PowerShell."
}
Ok ("Node.js " + $nodeCheck.Output)

# --- 2. Vercel CLI ---
Step "Verificando Vercel CLI"

$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if ($null -eq $vercelCmd) {
  Warn "Vercel CLI nao instalado. Instalando agora (npm i -g vercel)..."
  npm install -g vercel 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Die "Falha ao instalar Vercel CLI. Rode manualmente: npm install -g vercel"
  }
  Ok "Vercel CLI instalado"
} else {
  $vercelVer = RunQuiet "vercel" @("--version")
  # Pega so a ultima linha (versao), ignora avisos
  $verLine = ($vercelVer.Output -split "`r?`n" | Where-Object { $_ -match '^\d' } | Select-Object -Last 1)
  if ([string]::IsNullOrWhiteSpace($verLine)) { $verLine = "instalado" }
  Ok ("Vercel CLI " + $verLine.Trim())
}

# --- 3. Logout (se pedido) ---
if ($Logout) {
  Step "Deslogando conta Vercel"
  vercel logout 2>&1 | Out-Host
  Ok "Deslogado. Rode o script de novo pra logar com outra conta."
  exit 0
}

# --- 4. Login (se preciso) ---
Step "Verificando autenticacao Vercel"

$whoamiResult = RunQuiet "vercel" @("whoami")
# whoami retorna 0 e o user no stdout se logado; retorna != 0 se nao logado
$userLine = ""
if ($whoamiResult.ExitCode -eq 0) {
  # Filtra notas/avisos, pega so o nome de usuario (linha sem ">" no inicio)
  $lines = $whoamiResult.Output -split "`r?`n"
  foreach ($l in $lines) {
    $t = $l.Trim()
    if ($t -and $t -notmatch '^[>>!#]' -and $t -notmatch '^NOTE' -and $t -notmatch '^Vercel CLI' -and $t -notmatch '^npm' -and $t -notmatch '^WARN') {
      $userLine = $t
      break
    }
  }
}

if ([string]::IsNullOrWhiteSpace($userLine)) {
  Warn "Voce nao esta logado no Vercel. Abrindo browser pra login..."
  Write-Host ""
  Write-Host "    DICA: use a mesma conta GitHub do repo (rodribinho13-debug)" -ForegroundColor Yellow
  Write-Host "    pra Vercel detectar automaticamente o repo." -ForegroundColor Yellow
  Write-Host ""
  vercel login
  if ($LASTEXITCODE -ne 0) {
    Die "Login falhou. Tente de novo."
  }
  # Re-check
  $whoamiResult = RunQuiet "vercel" @("whoami")
  $lines = $whoamiResult.Output -split "`r?`n"
  foreach ($l in $lines) {
    $t = $l.Trim()
    if ($t -and $t -notmatch '^[>>!#]' -and $t -notmatch '^NOTE' -and $t -notmatch '^Vercel CLI' -and $t -notmatch '^npm' -and $t -notmatch '^WARN') {
      $userLine = $t
      break
    }
  }
}
Ok ("Logado como: " + $userLine)

# --- 5. Confirmacao ---
$envLabel = if ($Preview) { "PREVIEW (URL temporaria)" } else { "PRODUCAO" }
Step ("Pronto pra deploy: " + $envLabel)

Write-Host ""
Write-Host "  RESUMO:" -ForegroundColor White
Write-Host ("    Pasta:    " + (Get-Location).Path)
Write-Host ("    Projeto:  " + $ProjectName)
Write-Host ("    Ambiente: " + $envLabel)
Write-Host ("    Usuario:  " + $userLine)
Write-Host ""

$confirm = Read-Host "  Confirmar deploy? (S/N)"
if ($confirm -notmatch '^[sS]') {
  Warn "Deploy cancelado."
  exit 0
}

# --- 6. Linkar projeto (cria com nome valido, evita inferir da pasta) ---
Step ("Linkando pasta ao projeto Vercel '" + $ProjectName + "'")
if (-not (Test-Path ".vercel/project.json")) {
  vercel link --yes --project $ProjectName 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Warn "vercel link retornou erro - tentando deploy direto mesmo assim."
  } else {
    Ok ("projeto linkado: " + $ProjectName)
  }
} else {
  Ok "pasta ja linkada (.vercel/project.json existe)"
}

# --- 7. Deploy ---
$deployArgs = @("deploy", "--yes")
if (-not $Preview) {
  $deployArgs += "--prod"
}

Step ("vercel " + ($deployArgs -join " "))
Write-Host ""

vercel @deployArgs

if ($LASTEXITCODE -ne 0) {
  Die "Deploy falhou. Veja os logs acima."
}

Write-Host ""
Write-Host "==> CONCLUIDO!" -ForegroundColor Green
Write-Host ""
Write-Host "    A URL acima e o site no ar."
Write-Host "    Painel Vercel: https://vercel.com/dashboard"
Write-Host ""
Write-Host "    PROXIMOS DEPLOYS:"
Write-Host "      .\PUSH_TO_GITHUB.ps1   (sobe pro GitHub)"
Write-Host "      .\DEPLOY_VERCEL.ps1    (sobe pro Vercel)"
Write-Host ""
