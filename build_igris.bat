@echo off
title IGRIS 2.0 — Package Builder
echo ===================================================
echo  IGRIS 2.0 — Rebuilding Desktop Application
echo ===================================================

cd /d "%~dp0"

:: Step 1: Kill any running IGRIS process first
echo [Build] Stopping any running IGRIS process...
taskkill /F /IM IGRIS.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

:: Step 2: Build frontend + Node server bundle FIRST
echo [Build] Building frontend and Node server bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [Build] ERROR: npm run build failed with code %errorlevel%.
    pause
    exit /b %errorlevel%
)
echo [Build] Frontend build complete.

:: Step 3: Run PyInstaller with --clean to clear stale asset hash cache
echo [Build] Packaging IGRIS desktop application (this takes ~2 minutes)...
.venv\Scripts\python.exe -m PyInstaller IGRIS.spec --distpath dist_app --noconfirm --clean
if %errorlevel% neq 0 (
    echo [Build] ERROR: PyInstaller failed with code %errorlevel%.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo  Build complete!  dist_app\IGRIS\IGRIS.exe is ready.
echo  Launch with:  dist_app\IGRIS\IGRIS.exe
echo              or double-click the IGRIS AI desktop shortcut.
echo ===================================================
pause
