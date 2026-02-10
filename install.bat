@echo off
chcp 65001 >NUL
echo.
echo ========================================
echo Tim A^&R Manager Setup
echo ========================================
echo.

set SCRIPT_DIR=%~dp0
set TARGET_BAT=%SCRIPT_DIR%Tim 실행.bat
set DESKTOP=%USERPROFILE%\Desktop

REM OneDrive Desktop fallback
if exist "%USERPROFILE%\OneDrive\바탕 화면" (
    set DESKTOP=%USERPROFILE%\OneDrive\바탕 화면
)

set SHORTCUT=%DESKTOP%\Tim A^&R Manager.lnk

echo Creating desktop shortcut...
echo.

powershell -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); $Shortcut.TargetPath = '%TARGET_BAT%'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.Description = 'Tim A&R Manager'; $Shortcut.Save()"

if exist "%SHORTCUT%" (
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo.
    echo Desktop shortcut created successfully!
    echo Location: %SHORTCUT%
    echo.
    echo How to use:
    echo 1. Double-click 'Tim A^&R Manager' on desktop
    echo 2. Server starts automatically
    echo 3. Browser opens at http://localhost:3000
    echo.
    echo To stop: Press any key in the CMD window
    echo.
) else (
    echo ========================================
    echo Manual Setup Required
    echo ========================================
    echo.
    echo Please create a shortcut manually:
    echo 1. Right-click on desktop
    echo 2. New -^> Shortcut
    echo 3. Target: %TARGET_BAT%
    echo 4. Name: Tim A^&R Manager
    echo.
)

pause
