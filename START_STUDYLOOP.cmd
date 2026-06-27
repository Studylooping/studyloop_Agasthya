@echo off
cd /d "%~dp0"

echo Starting StudyLoop...
echo.
echo When you see "Ready", open:
echo http://localhost:3000
echo.
echo Keep this window open while testing.
echo Press Ctrl+C here to stop StudyLoop.
echo.

"C:\Program Files\nodejs\node.exe" scripts\next-dev.mjs

echo.
echo StudyLoop stopped.
pause
