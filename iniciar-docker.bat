@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════
echo   ESVOJOP 2026 · INICIADOR DOCKER AISLADO
echo ═══════════════════════════════════════════════════
echo.

echo Verificando conexión con el motor de Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker Desktop no está iniciado o aún está cargando el motor.
    echo Intentando abrir Docker Desktop en segundo plano...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo.
    echo Por favor, espera a que el icono de Docker en la barra de tareas
    echo termine de arrancar (icono verde) y presiona cualquier tecla para continuar.
    echo.
    pause
)

echo [✓] Motor de Docker activo. Construyendo y levantando contenedor...
cd /d "%~dp0"
docker-compose up -d --build

echo.
echo ═══════════════════════════════════════════════════
echo   ¡Listo! Tu sitio está corriendo en Docker:
echo   👉 http://localhost:8085
echo ═══════════════════════════════════════════════════
echo.
echo Abriendo en tu navegador...
start http://localhost:8085
pause
