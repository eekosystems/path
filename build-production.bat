@echo off
echo ====================================
echo Building DocWriter for Production
echo ====================================
echo.

echo Cleaning previous builds...
rmdir /S /Q dist 2>nul
rmdir /S /Q dist-electron 2>nul

echo.
echo Installing dependencies...
call npm install

echo.
echo Building application...
call npm run build

echo.
echo ====================================
echo Build Complete!
echo ====================================
echo.
echo Installer location:
echo Windows: dist\DocWriter Setup *.exe
echo.
echo This installer includes:
echo - Built-in cloud service support (Google Drive, Dropbox, OneDrive)
echo - No configuration needed by users
echo - Ready for distribution
echo.
pause