@echo off
echo Killing any existing Electron processes...
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM "Doc Writer.exe" 2>nul
taskkill /F /IM DocWriter.exe 2>nul
echo Done. You can now start the app.