@echo off
echo ========================================
echo DocWriter - Building Signed Installer
echo ========================================
echo.

REM Prompt for certificate password if not set
if "%CSC_KEY_PASSWORD%"=="" (
    set /p CSC_KEY_PASSWORD="Enter certificate password: "
)

REM Set certificate path - use full path for electron-builder
set CSC_LINK=%cd%\certificate.pfx

echo Certificate: %CSC_LINK%

echo.
echo Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron

echo.
echo Installing dependencies...
call npm install

echo.
echo Building application...
call npm run build

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Installers created in the 'dist' folder:
echo - DocWriter Setup.exe (NSIS Installer)
echo - DocWriter Portable.exe (Portable Version)
echo.
echo The installers are signed with your certificate.
echo.
pause