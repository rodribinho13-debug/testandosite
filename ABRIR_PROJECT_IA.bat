@echo off
REM ════════════════════════════════════════════════════════════
REM PROJECT.IA — Launcher local (resolve problema file://)
REM Sobe um servidor HTTP local na porta 8765 e abre o navegador.
REM Necessario: Python 3 instalado (ja vem em qualquer Win10+)
REM ════════════════════════════════════════════════════════════

cd /d "%~dp0"
title PROJECT.IA - Servidor Local

REM Detecta python
where py >nul 2>&1
if %ERRORLEVEL%==0 (
    set "PYCMD=py -3"
) else (
    where python >nul 2>&1
    if %ERRORLEVEL%==0 (
        set "PYCMD=python"
    ) else (
        echo.
        echo [ERRO] Python 3 nao encontrado.
        echo Instale em: https://www.python.org/downloads/
        echo Marque "Add Python to PATH" durante a instalacao.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo  ████████████████████████████████████████████████████
echo  █                                                  █
echo  █             PROJECT.IA - Servidor Local          █
echo  █                                                  █
echo  ████████████████████████████████████████████████████
echo.
echo  URL: http://localhost:8765/index.html
echo.
echo  - Feche esta janela para parar o servidor
echo  - Faca login uma unica vez, persiste em todas as telas
echo  - Tecle Ctrl+C para encerrar
echo.

REM Abre o navegador depois de 2s
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8765/index.html"

REM Sobe o servidor
%PYCMD% -m http.server 8765 --bind 127.0.0.1

pause
