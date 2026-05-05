@echo off
title DAST Report Generator — Launcher
color 0A

echo.
echo  ============================================
echo    DAST Report Generator — Starting Up...
echo  ============================================
echo.

:: Step 1 — Free port 3001 if anything is using it
echo  [1/3]  Clearing port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo         Done.
echo.

:: Step 2 — Start the backend in a new window
echo  [2/3]  Starting Backend...
start "DAST Backend (keep open)" cmd /k "cd /d "%~dp0my-backend-app" && npm start"
echo         Backend window opened.
echo.

:: Wait for backend to be ready before starting frontend
timeout /t 5 /nobreak >nul

:: Step 3 — Start the frontend in a new window
echo  [3/3]  Starting Frontend...
start "DAST Frontend (keep open)" cmd /k "cd /d "%~dp0my-frontend-app" && npx vite --host 0.0.0.0 --port 5173"
echo         Frontend window opened.
echo.

:: Wait then open the browser automatically
timeout /t 5 /nobreak >nul
echo  Opening browser...
start http://localhost:5173

echo.
echo  ============================================
echo    App is running at http://localhost:5173
echo.
echo    Keep both windows open while using app.
echo    Run  Stop App.bat  to shut everything down.
echo  ============================================
echo.
pause
