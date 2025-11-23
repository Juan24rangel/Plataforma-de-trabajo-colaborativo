@echo off
echo ================================================
echo  Iniciando servidor Django con soporte WebSocket
echo ================================================
echo.
cd /d "%~dp0Proyecto-2-BACKEND"
echo Ejecutando Daphne en puerto 8000...
echo.
daphne -b 0.0.0.0 -p 8000 backend.asgi:application
