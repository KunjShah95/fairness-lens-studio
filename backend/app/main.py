"""
EquityLens FastAPI Application
Main entry point for the bias detection API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


from app.config import settings
from app.db.session import engine
from app.db.models import Base
from app.routers import (
    datasets,
    audit,
    mitigation,
    simulator,
    portal,
    governance,
    reports,
    demo,
    drift,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Create FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the FastAPI application."""
    # Startup logic
    logger.info(f"Starting EquityLens API in {settings.environment} mode")
    logger.info(f"Database: {settings.database_url}")
    logger.info(f"Redis: {settings.redis_url}")
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables ready")
    except Exception as exc:
        logger.warning(f"Database initialization skipped/unavailable: {exc}")

    # Initialize weaviate in background to not block startup
    import threading

    threading.Thread(target=_init_weaviate, daemon=True).start()

    # Initialize drift monitoring scheduler
    try:
        from app.tasks.drift_tasks import start_scheduler

        start_scheduler()
        logger.info("Drift monitoring scheduler initialized")
    except Exception as exc:
        logger.warning(f"Drift scheduler initialization skipped: {exc}")

    # Initialize AI services
    try:
        from app.services.cache_service import cache_service
        from app.services.rate_limiter import rate_limiter

        await cache_service.connect()
        await rate_limiter.connect()
        logger.info("AI services initialized")
    except Exception as e:
        logger.warning(f"AI services initialization skipped: {e}")

    yield

    # Shutdown logic
    logger.info("Shutting down EquityLens API")
    if _weaviate_initialized:
        weaviate_manager.close()

    # Stop drift monitoring scheduler
    try:
        from app.tasks.drift_tasks import stop_scheduler

        stop_scheduler()
    except Exception:
        pass  # Scheduler may not have been started


app = FastAPI(
    title="EquityLens API",
    description="AI Bias Detection and Fairness Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
cors_origins = [
    origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(datasets.router)
app.include_router(audit.router)
app.include_router(mitigation.router)
app.include_router(simulator.router)
app.include_router(portal.router)
app.include_router(governance.router)
app.include_router(reports.router)
app.include_router(demo.router)
app.include_router(drift.router)

from app.db.weaviate_client import weaviate_manager

# Initialize weaviate in background to not block startup
_weaviate_initialized = False


def _init_weaviate():
    global _weaviate_initialized
    if _weaviate_initialized:
        return
    try:
        weaviate_manager.connect()
        _weaviate_initialized = True
    except Exception as exc:
        logger.warning(f"Weaviate initialization skipped: {exc}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": "0.1.0",
    }


# Serve static files in production
if os.path.exists("static"):
    # First, try to serve files from static/assets
    if os.path.exists("static/assets"):
        app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the frontend index.html for all non-API routes."""
        # Check if requested path is a specific file in static directory
        static_path = os.path.join("static", full_path)
        if full_path and os.path.isfile(static_path):
            return FileResponse(static_path)

        # Don't serve index.html for API or docs routes that reached here
        if (
            full_path.startswith("api/")
            or full_path == "docs"
            or full_path == "openapi.json"
        ):
            return {"error": "Not Found"}

        # SPA fallback: return index.html for everything else
        index_path = os.path.join("static", "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)

        return {"error": "Frontend not found"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
