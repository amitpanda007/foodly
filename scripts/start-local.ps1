# Foodly Local Development Startup Script for Windows PowerShell
# This script helps start all services for local development

Write-Host "🍳 Starting Foodly Local Development Environment..." -ForegroundColor Green
Write-Host ""

# Check and create env files
Write-Host "📋 Checking environment files..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "  Creating root .env from env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
}

if (-not (Test-Path "backend/.env")) {
    Write-Host "  Creating backend/.env from backend/env.example..." -ForegroundColor Yellow
    Copy-Item "backend/env.example" "backend/.env"
}

if (-not (Test-Path "frontend/.env")) {
    Write-Host "  Creating frontend/.env from frontend/env.example..." -ForegroundColor Yellow
    Copy-Item "frontend/env.example" "frontend/.env"
}

Write-Host "✅ Environment files ready" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Python is not installed. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js is not installed. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Start Backend
Write-Host "🚀 Setting up Backend..." -ForegroundColor Cyan
Push-Location backend

if (-not (Test-Path "venv")) {
    Write-Host "  📦 Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

Write-Host "  📦 Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt -q

Write-Host "  🔧 Starting FastAPI server..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & ".\venv\Scripts\Activate.ps1"
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

Pop-Location

# Start Frontend
Write-Host "🎨 Setting up Frontend..." -ForegroundColor Cyan
Push-Location frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "  📦 Installing npm dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "  🔧 Starting Vite dev server..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

Pop-Location

Write-Host ""
Write-Host "✅ Foodly is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "📍 Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📍 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Wait and show output
try {
    while ($true) {
        Receive-Job $backendJob -ErrorAction SilentlyContinue
        Receive-Job $frontendJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
}
