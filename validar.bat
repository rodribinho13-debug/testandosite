@echo off
REM ============================================================
REM   PROJECT.IA - Validador automatico
REM   Roda antes de salvar mudancas para evitar arquivos quebrados
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo =============================================
echo  PROJECT.IA - Validacao automatica
echo =============================================
echo.

set ERRORS=0
set WARNINGS=0

REM --- Verifica se Node esta instalado ---
where node >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Node.js nao encontrado no PATH.
  echo         Instale em https://nodejs.org para validar sintaxe JS automaticamente.
  echo         Pulando validacao de sintaxe JS...
  set /a WARNINGS+=1
  goto check_html
)

echo [INFO] Node.js:
node --version
echo.

REM --- Valida sintaxe JS de cada modulo ---
echo [1/3] Validando sintaxe de arquivos .js...
for %%f in (custom_views.js assets\js\security.js assets\js\saas-modules.js assets\js\ia-chat.js assets\js\v9-app.js sw.js) do (
  if exist "%%f" (
    node --check "%%f" 2>&1
    if errorlevel 1 (
      echo   X %%f - SINTAXE INVALIDA
      set /a ERRORS+=1
    ) else (
      echo   OK %%f
    )
  )
)

:check_html
echo.
echo [2/3] Validando balanceamento de tags HTML...

for %%f in (hydrostec_v9.html hydrostec_planejador.html hydrostec_planejador_civil.html hydrostec_planejador_eletrica.html hydrostec_planejador_pintura.html hydrostec_planejador_caldeiraria.html) do (
  if exist "%%f" (
    call :check_balance "%%f"
  )
)

echo.
echo [3/3] Validando que arquivos terminam em ^</html^>...
for %%f in (hydrostec_v9.html hydrostec_planejador.html hydrostec_planejador_civil.html hydrostec_planejador_eletrica.html hydrostec_planejador_pintura.html hydrostec_planejador_caldeiraria.html) do (
  if exist "%%f" (
    powershell -NoProfile -Command "$c=(Get-Content '%%f' -Raw).TrimEnd(); if($c.EndsWith('</html>')){Write-Host '  OK %%f'}else{Write-Host '  X  %%f - NAO termina em </html>'; exit 1}"
    if errorlevel 1 set /a ERRORS+=1
  )
)

echo.
echo =============================================
if !ERRORS! GTR 0 (
  echo  RESULTADO: !ERRORS! ERRO^(S^) encontrado^(s^)
  echo =============================================
  echo.
  echo  NAO publique este sistema enquanto houver erros.
  echo  Restaure do backup mais recente em _backup_*\
  pause
  exit /b 1
) else (
  if !WARNINGS! GTR 0 (
    echo  RESULTADO: OK com !WARNINGS! aviso^(s^)
  ) else (
    echo  RESULTADO: TUDO OK - seguro publicar
  )
  echo =============================================
)
pause
exit /b 0

REM ============================================================
REM   Funcao: checa balanceamento de tags <script>/</script>
REM ============================================================
:check_balance
set FILE=%~1
powershell -NoProfile -Command "$c=Get-Content '%FILE%' -Raw; $o=([regex]::Matches($c,'<script\b')).Count; $cl=([regex]::Matches($c,'</script>')).Count; if($o -eq $cl){Write-Host ('  OK '+$args[0]+' (<script>='+$o+' </script>='+$cl+')')}else{Write-Host ('  X  '+$args[0]+' DESBALANCEADO: <script>='+$o+' </script>='+$cl); exit 1}" "%FILE%"
if errorlevel 1 set /a ERRORS+=1
exit /b 0
