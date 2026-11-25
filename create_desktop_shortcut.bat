@echo off
title Create IGRIS Desktop Shortcut
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0create_desktop_shortcut.ps1"
echo.
echo You can now launch IGRIS anytime directly from the shortcut on your Desktop!
pause
