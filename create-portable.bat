@echo off
echo Creating portable DocWriter ZIP...
cd dist
powershell Compress-Archive -Path win-unpacked\* -DestinationPath DocWriter-Portable-1.0.1.zip -Force
echo.
echo Created: dist\DocWriter-Portable-1.0.1.zip
echo This ZIP file can be uploaded to your website!
echo.
echo Users can:
echo 1. Download the ZIP
echo 2. Extract it
echo 3. Run DocWriter.exe
echo.
pause