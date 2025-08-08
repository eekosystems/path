@echo off
echo Creating self-extracting EXE...
echo.
echo Please install 7-Zip first from: https://www.7-zip.org/
echo.
if exist "C:\Program Files\7-Zip\7z.exe" (
    cd dist
    "C:\Program Files\7-Zip\7z.exe" a -sfx7z.sfx DocWriter-Installer.exe win-unpacked\*
    echo.
    echo SUCCESS! Created: dist\DocWriter-Installer.exe
    echo This is your single EXE file for the website!
) else (
    echo ERROR: 7-Zip not found!
    echo Please install from: https://www.7-zip.org/
    echo Then run this script again.
)
pause