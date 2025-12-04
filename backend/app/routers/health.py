from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.config import get_settings

router = APIRouter(prefix="/api/health", tags=["health"])
settings = get_settings()


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint."""
    health_status = {
        "status": "healthy",
        "database": "unknown",
        "llm_provider": settings.llm_provider
    }
    
    # Check database connection
    try:
        await db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status

