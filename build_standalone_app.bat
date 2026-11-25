@echo off
title Build IGRIS Standalone Desktop Executable
cd /d "%~dp0"
echo ===================================================
echo Building IGRIS 2.0 Standalone Desktop Application
echo ===================================================

echo [1/2] Building React web application and server bundle...
call npm run build
if %errorlevel% neq 0 (
    echo Error: npm build failed.
    pause
    exit /b %errorlevel%
)

echo [2/2] Compiling Python QtWebEngine Desktop App with PyInstaller...
.\.venv\Scripts\python.exe -m PyInstaller IGRIS.spec --distpath dist_app --noconfirm
if %errorlevel% neq 0 (
    echo Error: PyInstaller compilation failed.
    pause
    exit /b %errorlevel%
)

echo ===================================================
echo SUCCESS! IGRIS has been compiled to:
echo %~dp0dist_app\IGRIS\IGRIS.exe
echo ===================================================
pause
