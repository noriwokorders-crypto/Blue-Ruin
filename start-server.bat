@echo off
echo Starting local web server...
echo.
echo Open your browser and go to:
echo   - Mobile Game: http://localhost:8000/mobile-game.html
echo   - Test Map: http://localhost:8000/test-map.html
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python HTTP server...
    python -m http.server 8000
    goto :end
)

REM Try Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js HTTP server...
    npx --yes http-server -p 8000
    goto :end
)

echo ERROR: Neither Python nor Node.js found!
echo Please install Python or Node.js, or use VS Code Live Server extension.
pause

:end
