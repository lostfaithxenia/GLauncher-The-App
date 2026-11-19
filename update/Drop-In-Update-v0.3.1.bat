@echo off
title GLauncher v0.3.1 - Instant Drag & Drop Updater
echo ====================================================================
echo         GLauncher v0.3.1 - Instant Drag & Drop Updater
echo ====================================================================
echo.
echo Your profiles, games, custom banners, roles & media are 100%% SAFE!
echo.
taskkill /IM "GLauncher.exe" /F >nul 2>&1
timeout /t 1 /nobreak >nul

if exist "%~dp0resources\app.asar" (
  copy /Y "%~dp0app.asar" "%~dp0resources\app.asar" >nul
  echo [OK] Updated GLauncher in this folder to v0.3.1!
  if exist "%~dp0GLauncher.exe" start "" "%~dp0GLauncher.exe"
  pause
  exit /b 0
)

if exist "%LOCALAPPDATA%\Programs\GLauncher\resources\app.asar" (
  copy /Y "%~dp0app.asar" "%LOCALAPPDATA%\Programs\GLauncher\resources\app.asar" >nul
  echo [OK] Updated installed GLauncher (%LOCALAPPDATA%\Programs\GLauncher) to v0.3.1!
  start "" "%LOCALAPPDATA%\Programs\GLauncher\GLauncher.exe"
  pause
  exit /b 0
)

echo Could not find GLauncher automatically.
echo Just drag "app.asar" onto GLauncher, copy it into GLauncher\resources\, or run GLauncher-Setup-0.3.1.exe.
pause
