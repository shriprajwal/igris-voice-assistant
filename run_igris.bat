@echo off
title IGRIS 2.0 Desktop AI Assistant
echo ===================================================
echo Starting IGRIS 2.0 Desktop Voice Assistant...
echo ===================================================

cd /d "%~dp0"

:: Run IGRIS Desktop Application
if exist "dist_app\IGRIS\IGRIS.exe" (
    echo [IGRIS Launcher] Launching IGRIS Desktop Application...
    "dist_app\IGRIS\IGRIS.exe"
) else if exist ".venv\Scripts\python.exe" (
    echo [IGRIS Launcher] Launching IGRIS Desktop Shell via .venv Python...
    ".venv\Scripts\python.exe" "igris_desktop\app.py"
) else (
    echo [IGRIS Launcher] Launching IGRIS Desktop Shell via system Python...
    python "igris_desktop\app.py"
)

if %errorlevel% neq 0 (
    echo.
    echo [IGRIS Launcher] App stopped with exit code %errorlevel%.
    pause
)
