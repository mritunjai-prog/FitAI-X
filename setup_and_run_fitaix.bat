@echo off
echo ========================================================
echo FitAI-X Complete Setup and Run Script
echo ========================================================
echo.

echo [1/4] Installing Backend Dependencies...
cd backend\core-api
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies.
    pause
    exit /b %errorlevel%
)
echo.

echo [2/4] Starting PostgreSQL Database and Syncing Schema...
call docker-compose up -d
call npx prisma generate
call npx prisma db push
echo.

echo [3/4] Installing Frontend Dependencies...
cd ..\..\frontend\mobile
call npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies.
    pause
    exit /b %errorlevel%
)
echo.

echo [4/4] Starting Servers...
echo Starting Backend in a new window...
cd ..\..\backend\core-api
start "FitAI Backend" cmd /c "npx tsx watch src\index.ts"

echo Starting Frontend in a new window...
cd ..\..\frontend\mobile
start "FitAI Frontend" cmd /c "npx expo start -c"

echo.
echo ========================================================
echo Both servers are now starting up in separate windows!
echo - Look for the "FitAI Backend" and "FitAI Frontend" windows.
echo - You can scan the Expo QR code in the Frontend window.
echo ========================================================
pause
