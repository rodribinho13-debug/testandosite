@echo off
REM ====================================================================
REM PROJECT.IA Tests - Reset completo e reinstalacao
REM Use quando npm install falhar com EPERM, MODULE_NOT_FOUND, etc.
REM ====================================================================
echo.
echo === [1/5] Fechando processos que podem estar travando arquivos ===
taskkill /F /IM Cypress.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo.
echo === [2/5] Deletando node_modules (pode demorar) ===
if exist node_modules (
  rmdir /S /Q node_modules
)

echo.
echo === [3/5] Deletando package-lock e cache ===
if exist package-lock.json del /F /Q package-lock.json
call npm cache clean --force 2>nul

echo.
echo === [4/5] Instalando dependencias (~3-5 min, baixa Electron ~200MB) ===
call npm install --no-fund --no-audit

if errorlevel 1 (
  echo.
  echo *** ERRO na instalacao ***
  echo Possiveis causas:
  echo  - Antivirus bloqueando arquivos (desative temporariamente)
  echo  - OneDrive sincronizando a pasta (mova _tests pra fora)
  echo  - Node 24 incompativel (instale Node 20 LTS via nvm-windows)
  pause
  exit /b 1
)

echo.
echo === [5/5] Verificando instalacao ===
call npx cypress --version
if errorlevel 1 (
  echo.
  echo *** Cypress nao foi instalado corretamente ***
  pause
  exit /b 1
)

echo.
echo ====================================================================
echo  ✓ Instalacao concluida!
echo.
echo  Proximos passos:
echo    npm test         (roda headless, gera relatorio)
echo    npm run test:open (abre Cypress Test Runner interativo)
echo ====================================================================
pause
