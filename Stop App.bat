@echo off
title DAST Report Generator — Stopping
color 0C

echo.
echo  ============================================
echo    Stopping DAST Report Generator...
echo  ============================================
echo.

:: Kill backend (port 3001)
echo  Stopping Backend (port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  Done.

:: Kill frontend (port 5173)
echo  Stopping Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  Done.

echo.
echo  ============================================
echo    All servers stopped.
echo  ============================================
echo.
pause
