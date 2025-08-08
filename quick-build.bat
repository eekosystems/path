@echo off
echo Building DocWriter...
echo.

echo Step 1: Building frontend...
call npx vite build

echo.
echo Step 2: Building Electron...
call npx electron-builder --win --x64

echo.
echo Build complete! Check dist folder for:
echo - DocWriter Setup 1.0.1.exe (installer)
echo - DocWriter 1.0.1.exe (portable)
echo.
pause