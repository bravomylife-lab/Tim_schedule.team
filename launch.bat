@echo off
chcp 65001 >NUL 2>&1
title Tim - A&R Scheduling Manager
cd /d "%~dp0"
node start.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Failed to start. Make sure Node.js is installed.
    echo.
    pause
)
