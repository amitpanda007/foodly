from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.database import init_db
from app.routers import recipes_router, health_router, voices_router, users_router, auth_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown


app = FastAPI(
    title="Foodly API",
    description="AI-powered recipe narration and step-by-step cooking guide",
    version="1.0.0",
    lifespan=lifespan
)

# Mount static directory for audio files
static_path = Path(__file__).parent / "static"
static_path.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Configure CORS
origins = [origin.strip() for origin in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(recipes_router)
app.include_router(health_router)
app.include_router(voices_router)
app.include_router(users_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Foodly API",
        "docs": "/docs",
        "health": "/api/health"
    }

