@echo off
rem Starts the Klenz API (port 8000) and website (port 5173), each in its own window.
rem The first run installs the Python and Node packages.
cd /d "%~dp0"

if not exist backend\.env (
  copy backend\.env.example backend\.env >nul
  echo Created backend\.env from .env.example - check DATABASE_URL and ADMIN_PASSWORD.
)

if not exist backend\.venv (
  echo Installing Python packages...
  python -m venv backend\.venv || goto :failed
  backend\.venv\Scripts\python -m pip install -r backend\requirements-dev.txt || goto :failed
)

if not exist frontend\node_modules (
  echo Installing website packages...
  pushd frontend
  call npm install || (popd & goto :failed)
  popd
)

start "Klenz API" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"
start "Klenz website" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host"

echo.
echo   Website:  http://localhost:5173
echo   Admin:    http://localhost:5173/admin
echo   API docs: http://localhost:8000/api/docs
echo.
exit /b 0

:failed
echo.
echo Setup failed - see the messages above.
pause
exit /b 1
