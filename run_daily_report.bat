@echo off
cd /d "%~dp0"
echo Running Daily Report Job...
call npm run daily-report
echo.
echo Job Finished.
pause
