# Foodly - AI-Powered Recipe Narration App

A full-stack web application that transforms recipe URLs and YouTube videos into step-by-step audio and text narrations. Built with React, TypeScript, FastAPI, and Ollama for local AI processing.

## Features

- 🔗 **URL & YouTube Support**: Paste any recipe URL or YouTube cooking video
- 🎯 **Step-by-Step Guide**: Get organized, easy-to-follow recipe steps
- 🎤 **Voice Commands**: Navigate through steps using voice ("next", "back", "repeat")
- 🔊 **Audio Narration**: Listen to each step with text-to-speech
- 📱 **Mobile Friendly**: Responsive design optimized for cooking in the kitchen
- 🌙 **Dark/Light Mode**: Toggle between themes for comfortable viewing
- 📱 **Screen Wake Lock**: Keep your screen on while cooking
- 🔍 **Recipe Search**: Search through your saved recipes
- 🤖 **Local AI**: Uses Ollama for privacy-focused local processing
- ☁️ **Cloud AI Options**: Optional support for OpenAI and Google Gemini

## Tech Stack

### Backend
- **FastAPI** - High-performance async Python framework
- **PostgreSQL** - Robust relational database
- **SQLAlchemy** - Async ORM for database operations
- **Ollama** - Local LLM inference
- **BeautifulSoup** - Web scraping for recipe extraction
- **youtube-transcript-api** - YouTube video transcript extraction

### Frontend
- **React 18** - UI framework with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Web Speech API** - Voice recognition and synthesis
- **Screen Wake Lock API** - Keep screen active

## Project Structure

```
foodly/
├── docker-compose.yml          # Full production deployment
├── docker-compose.dev.yml      # Development (DB + Ollama only)
├── env.example                 # Docker Compose env template
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── env.example             # Backend env template
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/
│       ├── routers/
│       ├── schemas/
│       └── services/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── env.example             # Frontend env template
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── services/
│
└── scripts/
    ├── start-local.ps1         # Windows local dev
    ├── start-local.sh          # Linux/Mac local dev
    ├── setup-ollama.ps1        # Windows Ollama setup
    └── setup-ollama.sh         # Linux/Mac Ollama setup
```

## Quick Start

### Prerequisites

- Docker & Docker Compose (recommended)
- OR Node.js 18+ and Python 3.11+
- PostgreSQL 16 (for local development)
- Ollama (for local AI)

### Docker Deployment (Recommended)

1. Clone and navigate to the project:
   ```bash
   cd foodly
   ```

2. Copy environment file:
   ```bash
   cp env.example .env
   ```

3. Start all services:
   ```bash
   docker-compose up -d
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Local Development

#### Option 1: Using Helper Script (Recommended)

**Windows (PowerShell):**
```powershell
# Start database and Ollama first
docker-compose -f docker-compose.dev.yml up -d

# Setup Ollama model
.\scripts\setup-ollama.ps1

# Start both frontend and backend
.\scripts\start-local.ps1
```

**Linux/Mac:**
```bash
# Start database and Ollama first
docker-compose -f docker-compose.dev.yml up -d

# Setup Ollama model
./scripts/setup-ollama.sh

# Start both frontend and backend
./scripts/start-local.sh
```

#### Option 2: Manual Setup

**Database (PostgreSQL):**

1. Install PostgreSQL 16+ for your OS:
   - [Windows Installer](https://www.postgresql.org/download/windows/)
   - [macOS (Postgres.app)](https://postgresapp.com/) or `brew install postgresql@16`
   - [Linux](https://www.postgresql.org/download/linux/)

2. Start the PostgreSQL service.

3. Create the database and user:
   ```bash
   # Open psql terminal (requires adding psql to PATH)
   psql -U postgres
   ```

   ```sql
   -- Inside psql console:
   CREATE DATABASE foodly_db;
   CREATE USER foodly WITH ENCRYPTED PASSWORD 'foodly_password';
   GRANT ALL PRIVILEGES ON DATABASE foodly_db TO foodly;
   -- Connect to the new database to grant schema permissions if needed
   \c foodly_db
   GRANT ALL ON SCHEMA public TO foodly;
   ```

**Backend:**
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp env.example .env

# Run the server
uvicorn app.main:app --reload --port 8001
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp env.example .env

# Run dev server
npm run dev
```

## Configuration

### Environment Files

| File | Purpose |
|------|---------|
| `env.example` | Docker Compose variables (PostgreSQL, build args) |
| `backend/env.example` | Backend API configuration |
| `frontend/env.example` | Frontend Vite configuration |

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model to use | `llama3.2:3b` |
| `LLM_PROVIDER` | AI provider: `ollama`, `openai`, `gemini` | `ollama` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | - |
| `GEMINI_API_KEY` | Google Gemini API key (if using Gemini) | - |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173,...` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |

### Switching LLM Providers

Edit `backend/.env`:

```bash
# For local Ollama (default)
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2:3b

# For OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here

# For Google Gemini
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key-here
```

## Usage

1. **Add a Recipe**: Paste a recipe URL or YouTube video link
2. **Wait for Processing**: AI extracts and structures the recipe
3. **Follow Steps**: Use buttons or voice commands to navigate
4. **Voice Commands**:
   - "Next" / "Next step" - Go to next step
   - "Back" / "Previous" - Go to previous step
   - "Repeat" - Read current step again
5. **Mark Complete**: Check off steps as you complete them
6. **Screen Wake Lock**: Toggle to keep screen on while cooking

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/recipes/process` | Process a new recipe URL |
| `GET` | `/api/recipes` | Get all saved recipes |
| `GET` | `/api/recipes/{id}` | Get specific recipe |
| `DELETE` | `/api/recipes/{id}` | Delete a recipe |
| `GET` | `/api/recipes/search?q=` | Search recipes |
| `GET` | `/api/health` | Health check |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.
