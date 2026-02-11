@echo off
echo Starting TypeF@st server...
timeout /t 2 /nobreak >nul

REM Essayer différents emplacements de Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" http://localhost:8080
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" http://localhost:8080
) else (
    echo Warning: Microsoft Edge not found in default locations.
    echo Please install Edge or open http://localhost:8080 manually.
)

echo Server running on http://localhost:8080
echo Press Ctrl+C to stop the server
python -m http.server 8080

