@echo off
REM Starts the Narmada Hybrid presentation on http://localhost:8090 (works offline).
cd /d "%~dp0"
start "" http://localhost:8090/
where py >nul 2>nul && (py -m http.server 8090 --bind 127.0.0.1) || (python -m http.server 8090 --bind 127.0.0.1)
