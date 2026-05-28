# =============================================================================
# PROJECT.IA - PUSH PARA O GITHUB (Rodrigo)
# Repo: https://github.com/rodribinho13-debug/testandosite
#
# USO:
#   cd "C:\Users\Usuario\Downloads\SITE INTRANET"
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\PUSH_TO_GITHUB.ps1 -DryRun
#   .\PUSH_TO_GITHUB.ps1
# =============================================================================

param(
  [string]$RepoUrl = "https://github.com/rodribinho13-debug/testandosite.git",
  [string]$Name    = "Rodrigo Brandao",
  [string]$Email   = "rodribinho13@gmail.com",
  [string]$Branch  = "main",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host ""; Write-Host ("==>  " + $msg) -ForegroundColor Cyan }
function Ok($msg)   { Write-Host ("    [OK]  " + $msg) -ForegroundColor Green }
function Warn($msg) { Write-Host ("    [!]   " + $msg) -ForegroundColor Yellow }
function Die($msg)  { Write-Host ("    [X]   " + $msg) -ForegroundColor Red; exit 1 }

Step "Validando ambiente"

try { git --version | Out-Null; Ok "git instalado" } catch {
  Die "Git nao encontrado. Instale em https://git-scm.com/download/win"
}

if (-not (Test-Path ".gitignore")) {
  Die ".gitignore nao encontrado. Voce esta na pasta certa?"
}

if (-not (Test-Path "hydrostec_v9.html")) {
  Die "hydrostec_v9.html nao encontrado. Voce esta na pasta certa?"
}

Ok ("URL do remote: " + $RepoUrl)

Step "Inicializando repositorio local"

if (Test-Path ".git") {
  Warn "Ja existe pasta .git - reaproveitando."
} else {
  git init -b $Branch | Out-Null
  Ok ("git init -b " + $Branch)
}

git config --local user.name  $Name
git config --local user.email $Email
git config --local core.autocrlf true
git config --local core.longpaths true
Ok ("config local: " + $Name + " [" + $Email + "]")

Step "Adicionando arquivos (respeitando .gitignore)"
git add -A
$staged = git diff --cached --name-only
$count  = ($staged | Measure-Object).Count
Ok ([string]$count + " arquivo(s) preparado(s) para commit")

Step "Validando que nada sensivel vai pro GitHub"

$bad = $staged | Where-Object {
  $_ -match 'MINHAS_CREDENCIAIS' -or
  $_ -match '\.env$' -or
  $_ -match '\.env\.' -or
  $_ -match '\.bak$' -or
  $_ -match '\.bkp$' -or
  $_ -match '_backups_auto/' -or
  $_ -match '_archive_legacy/' -or
  $_ -match '\.credentials$' -or
  $_ -match '\.pem$' -or
  $_ -match '\.key$'
}

if ($bad) {
  Write-Host ""
  Write-Host "  ALERTA DE SEGURANCA - arquivos sensiveis no commit:" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host ("    - " + $_) -ForegroundColor Red }
  Write-Host ""
  $answer = Read-Host "  Continuar mesmo assim? Digite SIM em maiusculas"
  if ($answer -ne "SIM") { Die "Abortado pelo usuario. Edite o .gitignore e rode de novo." }
} else {
  Ok "Nenhum arquivo sensivel detectado"
}

Step "Top 10 maiores arquivos staged"
$staged | ForEach-Object {
  if (Test-Path $_) {
    [PSCustomObject]@{
      Path = $_
      SizeMB = [math]::Round((Get-Item $_).Length / 1MB, 2)
    }
  }
} | Sort-Object SizeMB -Descending | Select-Object -First 10 | Format-Table -AutoSize

if ($DryRun) {
  Warn "DRY RUN - nenhum commit/push foi feito."
  Write-Host "    Pra subir de verdade, rode SEM -DryRun"
  exit 0
}

Step "Criando commit"
$hasCommit = $false
try { git rev-parse --verify HEAD 2>$null | Out-Null; $hasCommit = $true } catch {}

if ($hasCommit) {
  Warn "Ja existe commit - fazendo novo commit incremental."
  $msg = "chore: sync " + (Get-Date -Format 'yyyy-MM-dd HH:mm')
  git commit -m $msg 2>$null
} else {
  git commit -m "feat: PROJECT.IA initial commit (v9.2.6)"
  Ok "commit criado"
}

Step "Configurando remote origin"
$existing = git remote 2>$null
if ($existing -contains "origin") {
  $currentUrl = git remote get-url origin
  if ($currentUrl -eq $RepoUrl) {
    Ok ("remote origin ja aponta pra " + $RepoUrl)
  } else {
    Warn ("remote origin tinha URL diferente. Atualizando para " + $RepoUrl)
    git remote set-url origin $RepoUrl
    Ok "remote origin atualizado"
  }
} else {
  git remote add origin $RepoUrl
  Ok "remote origin adicionado"
}

Step "Pronto pra subir"
Write-Host ""
Write-Host "  RESUMO:" -ForegroundColor White
Write-Host ("    Repo:   " + $RepoUrl)
Write-Host ("    Branch: " + $Branch)
Write-Host ("    Author: " + $Name + " [" + $Email + "]")
Write-Host ""

$confirm = Read-Host ("  Confirmar push para origin/" + $Branch + " ? (S/N)")
if ($confirm -notmatch '^[sS]') {
  Warn ("Push cancelado. Rode 'git push -u origin " + $Branch + "' quando quiser.")
  exit 0
}

Step ("git push -u origin " + $Branch)
git push -u origin $Branch

Write-Host ""
Write-Host "==> CONCLUIDO!" -ForegroundColor Green
$repoWeb = $RepoUrl -replace '\.git$',''
Write-Host ("    Repo no ar: " + $repoWeb)
Write-Host ""
Write-Host "    PROXIMOS PASSOS NO VERCEL:"
Write-Host "      1) Abra https://vercel.com/new"
Write-Host "      2) Import Git Repository, selecione esse repo"
Write-Host "      3) Framework Preset: Other"
Write-Host "      4) Root Directory: ./"
Write-Host "      5) Build Command: deixe vazio"
Write-Host "      6) Output Directory: deixe vazio"
Write-Host "      7) Clique Deploy"
Write-Host ""
