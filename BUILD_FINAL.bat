@echo off
echo ========================================
echo FINAL BUILD FOR WEBSITE DISTRIBUTION
echo ========================================
echo.

echo Cleaning old builds...
rd /s /q dist 2>nul
rd /s /q dist-electron 2>nul

echo.
echo Building application...
call npm run build

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo Look for these files in the dist folder:
echo.
echo 1. DocWriter Setup 1.0.1.exe (Installer - Best for website)
echo 2. DocWriter 1.0.1.exe (Portable - No install needed)
echo.
echo If only win-unpacked folder exists:
echo - The build partially completed
echo - ZIP the win-unpacked folder manually
echo - Upload that ZIP to your website
echo.
pause