@echo off
title Tim A&R Scheduling Manager
echo ====================================
echo Tim A^&R Scheduling Manager
echo ====================================
echo.
echo 서버를 시작하고 있습니다...
echo.

cd /d "%~dp0"

REM 이미 실행 중인 프로세스 확인 및 종료
tasklist /FI "WINDOWTITLE eq Tim A&R Scheduling Manager*" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo 이미 실행 중인 서버를 종료합니다...
    taskkill /FI "WINDOWTITLE eq Tim A&R Scheduling Manager*" /F >NUL 2>&1
    timeout /t 2 /nobreak >NUL
)

REM 서버 시작
echo npm run dev 실행 중...
start /B cmd /c "npm run dev >NUL 2>&1"

REM 서버가 준비될 때까지 대기 (최대 30초)
echo 서버 준비 대기 중...
set RETRY=0
:WAIT_LOOP
timeout /t 1 /nobreak >NUL
curl -s http://localhost:3000 >NUL 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ 서버가 준비되었습니다!
    goto OPEN_BROWSER
)
set /a RETRY=%RETRY%+1
if %RETRY% LSS 30 goto WAIT_LOOP

echo.
echo ⚠ 서버 시작 시간이 오래 걸리고 있습니다...
echo 브라우저를 여는 중입니다. 잠시만 기다려주세요.

:OPEN_BROWSER
echo 브라우저를 여는 중...
timeout /t 1 /nobreak >NUL
start http://localhost:3000

echo.
echo ====================================
echo Tim이 실행되었습니다!
echo 브라우저: http://localhost:3000
echo ====================================
echo.
echo 이 창을 닫으면 서버가 종료됩니다.
echo 종료하려면 아무 키나 누르세요...
pause >NUL

REM 서버 프로세스 종료
echo 서버를 종료하는 중...
taskkill /FI "WINDOWTITLE eq Tim A&R Scheduling Manager*" /F /T >NUL 2>&1
timeout /t 1 /nobreak >NUL
exit
