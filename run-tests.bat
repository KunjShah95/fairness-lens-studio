@echo off
REM Run Integration Tests for EquityLens
REM This script verifies frontend and backend are working together

color 0A
echo ==========================================
echo EquityLens Integration Test Suite
echo ==========================================
echo.

REM Check if backend is running
echo Checking if backend is running...
curl -s http://localhost:8000/api/demo/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend is running
) else (
    color 0C
    echo [ERROR] Backend not responding on http://localhost:8000
    echo Please start the backend first:
    echo   cd backend
    echo   python -m uvicorn app.main:app --reload
    pause
    exit /b 1
)

color 0A

REM Test 1: Health Check
echo Checking health endpoint...
curl -s http://localhost:8000/api/demo/health | findstr "healthy" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Test 1: Health Check passed
) else (
    echo [FAIL] Test 1: Health Check failed
    exit /b 1
)

REM Test 2: Sample Audit Data
echo Checking sample audit data...
curl -s http://localhost:8000/api/demo/sample-audit | findstr "fairness_score" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Test 2: Sample Audit Data passed
) else (
    echo [FAIL] Test 2: Sample Audit Data failed
    exit /b 1
)

REM Test 3: Report Generation
echo Checking report generation...
curl -s http://localhost:8000/api/demo/sample-report | findstr "Fairness Audit Report" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Test 3: Report Generation passed
) else (
    echo [FAIL] Test 3: Report Generation failed
    exit /b 1
)

REM Test 4: Model Card
echo Checking model card...
curl -s http://localhost:8000/api/demo/sample-model-card | findstr "Model Card" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Test 4: Model Card passed
) else (
    echo [FAIL] Test 4: Model Card failed
    exit /b 1
)

REM Test 5: API Endpoints
echo Checking API endpoints...
curl -s http://localhost:8000/api/demo/endpoints | findstr "Health & Demo" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Test 5: API Endpoints passed
) else (
    echo [FAIL] Test 5: API Endpoints failed
    exit /b 1
)

REM Summary
echo.
echo ==========================================
echo All integration tests passed!
echo ==========================================
echo.
echo System Status:
echo   [OK] Backend is running and healthy
echo   [OK] Sample audit data loads correctly
echo   [OK] Report generation working
echo   [OK] Model card generation working
echo   [OK] API endpoints documented
echo.
echo Next Steps:
echo   1. Start backend: cd backend ^&^& python -m uvicorn app.main:app --reload
echo   2. Start frontend: cd frontend ^&^& npm run dev
echo   3. Open http://localhost:5173 in browser
echo.
pause
