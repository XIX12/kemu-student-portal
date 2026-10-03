@echo off
cd /d "%~dp0"
echo Working folder: %CD%
if not exist package.json (
  echo ERROR: package.json not found in this folder.
  echo Make sure you extracted ALL files from the zip into this folder.
  dir
  pause
  exit /b 1
)
echo Found package.json - installing...
call npm install
echo Starting portal...
call npm run dev
pause
