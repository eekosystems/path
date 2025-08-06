@echo off
echo Starting Clerk App...
echo.
echo Step 1: Building with Vite...
call npm run vite:dev
echo.
echo Vite server started. Now run 'npm run electron' in a new terminal.
pause