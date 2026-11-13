@echo off
title CodePrep Launcher
echo ========================================================
echo   CodePrep Personal Interview Preparation Platform
echo ========================================================
echo.

echo [0/3] Terminating any lingering processes on ports 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":5000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":5173 "') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [1/3] Preparing Backend, Database, and Default Credentials...
cd /d "%~dp0backend"
call npm install
call npx prisma generate
call npx prisma db push
if errorlevel 1 (
    echo [WARN] Rebuilding corrupted SQLite database...
    if exist "%~dp0backend\prisma\dev.db" move /y "%~dp0backend\prisma\dev.db" "%~dp0backend\prisma\dev.db.corrupt.bak" >nul 2>&1
    if exist "%~dp0backend\prisma\dev.db-wal" del /f /q "%~dp0backend\prisma\dev.db-wal" >nul 2>&1
    if exist "%~dp0backend\prisma\dev.db-shm" del /f /q "%~dp0backend\prisma\dev.db-shm" >nul 2>&1
    if exist "%~dp0backend\prisma\dev.db-journal" del /f /q "%~dp0backend\prisma\dev.db-journal" >nul 2>&1
    if exist "%~dp0backend\dev.db" del /f /q "%~dp0backend\dev.db" >nul 2>&1
    call npx prisma db push
)
call npm run seed-user
call npm run seed-problems

echo.
echo [2/3] Launching Backend Server on port 5000...
start "CodePrep Backend" cmd /k cd /d "%~dp0backend" ^&^& npm run dev
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Preparing and Launching Frontend Client on port 5173...
cd /d "%~dp0frontend"
call npm install
start "CodePrep Frontend" cmd /k cd /d "%~dp0frontend" ^&^& npm run dev

echo.
echo ========================================================
echo   CodePrep is now running!
echo   Opening: http://localhost:5173
echo ========================================================
timeout /t 4 /nobreak >nul
start http://localhost:5173

