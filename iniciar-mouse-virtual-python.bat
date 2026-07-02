@echo off
cd /d "%~dp0"
echo Iniciando mouse virtual por camara...
echo Q para salir. ESPACIO para pausar/reanudar.
"C:\Users\Usuario\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "scripts\virtual_mouse.py"
pause
