@echo off
echo Starting Web AI in Action...
echo.

REM Start backend
echo Starting backend server...
start "Backend Server" cmd /k "cd backend && python -m venv venv 2>nul && venv\Scripts\activate && pip install -r requirements-minimal.txt && python -m uvicorn websocket_server:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a moment for backend to start
timeout /t 5 /nobreak

REM Start frontend  
echo Starting frontend server...
start "Frontend Server" cmd /k "npm install && npm run dev"

echo.
echo Servers are starting...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
pause
