#!/bin/bash

# Foodly Local Development Startup Script
# This script helps start all services for local development

set -e

echo "🍳 Starting Foodly Local Development Environment..."
echo ""

# Check and create env files
echo "📋 Checking environment files..."

if [ ! -f ".env" ]; then
    echo "  Creating root .env from env.example..."
    cp env.example .env
fi

if [ ! -f "backend/.env" ]; then
    echo "  Creating backend/.env from backend/env.example..."
    cp backend/env.example backend/.env
fi

if [ ! -f "frontend/.env" ]; then
    echo "  Creating frontend/.env from frontend/env.example..."
    cp frontend/env.example frontend/.env
fi

echo "✅ Environment files ready"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists python3 && ! command_exists python; then
    echo "  ❌ Python is not installed. Please install Python 3.11+"
    exit 1
fi
PYTHON_CMD=$(command_exists python3 && echo "python3" || echo "python")
echo "  ✅ Python: $($PYTHON_CMD --version)"

if ! command_exists node; then
    echo "  ❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi
echo "  ✅ Node.js: $(node --version)"

echo ""

# Start Backend
echo "🚀 Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "  📦 Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

echo "  📦 Installing Python dependencies..."
pip install -r requirements.txt -q

echo "  🔧 Starting FastAPI server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

# Start Frontend
echo "🎨 Setting up Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "  📦 Installing npm dependencies..."
    npm install
fi

echo "  🔧 Starting Vite dev server..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ Foodly is starting up!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend API: http://localhost:8000"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C to kill background processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait for processes
wait
