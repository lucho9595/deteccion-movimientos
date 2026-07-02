@echo off
cd /d "%~dp0"
echo Iniciando puente de mouse Windows...
echo Deja esta ventana abierta mientras uses Mouse Windows.
start "Servidor Mouse Windows" /min "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "%~dp0scripts\serve-mouse-bridge.mjs" 5194
echo Abri http://127.0.0.1:5194
pause
