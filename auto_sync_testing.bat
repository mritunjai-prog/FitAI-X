@echo off
title FitAI-X Auto Sync (testing branch)
echo ========================================================
echo  FitAI-X Auto Sync - Testing Branch Watcher
echo  Har 15 seconds mein naye commits check karega
echo  Ctrl+C se band karo
echo ========================================================
echo.

cd /d "%~dp0"

:: Current commit hash store karo
for /f %%i in ('git rev-parse HEAD') do set LAST_COMMIT=%%i
echo [START] Current commit: %LAST_COMMIT%
echo.

:loop
:: Remote se latest info fetch karo (without pulling)
git fetch origin testing >nul 2>&1

:: Remote testing branch ka latest commit lo
for /f %%i in ('git rev-parse origin/testing') do set REMOTE_COMMIT=%%i

:: Compare karo
if "%LAST_COMMIT%"=="%REMOTE_COMMIT%" (
    :: No changes - quietly wait
    echo [%time%] Up to date. Next check in 15 seconds...
    timeout /t 15 /nobreak >nul
    goto loop
)

:: Naya commit mila!
echo.
echo ========================================================
echo  [%time%] NEW COMMIT DETECTED!
echo  Old: %LAST_COMMIT%
echo  New: %REMOTE_COMMIT%
echo  Pulling changes...
echo ========================================================

:: Pull karo
git pull origin testing

:: Check karo kya package.json change hua
git diff %LAST_COMMIT% %REMOTE_COMMIT% --name-only | findstr "package.json" >nul
if %errorlevel% equ 0 (
    echo.
    echo [INFO] package.json changed - reinstalling dependencies...
    cd backend\core-api
    call npm install >nul 2>&1
    cd ..\..\frontend\mobile
    call npm install >nul 2>&1
    cd ..\..
)

:: Check karo kya prisma schema change hua
git diff %LAST_COMMIT% %REMOTE_COMMIT% --name-only | findstr "schema.prisma" >nul
if %errorlevel% equ 0 (
    echo.
    echo [INFO] Prisma schema changed - syncing database...
    cd backend\core-api
    call npx prisma db push >nul 2>&1
    cd ..\..
)

:: Update last commit
set LAST_COMMIT=%REMOTE_COMMIT%

echo.
echo [SUCCESS] Changes pulled! Dev servers hot-reload ho rahe hain...
echo ========================================================
echo.

timeout /t 15 /nobreak >nul
goto loop
