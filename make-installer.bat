@echo off
echo Creating self-extracting installer...
echo.

REM Use 7-Zip to create self-extracting archive (if available)
if exist "C:\Program Files\7-Zip\7z.exe" (
    "C:\Program Files\7-Zip\7z.exe" a -sfx DocWriter-Setup.exe dist\win-unpacked\*
    echo Created: DocWriter-Setup.exe
) else (
    echo 7-Zip not found. Creating regular ZIP instead...
    cd dist
    tar -a -c -f DocWriter-Portable.zip win-unpacked
    cd ..
    echo Created: dist\DocWriter-Portable.zip
)

echo.
echo Upload this file to your website!
pause