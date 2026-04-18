"""
EquityLens FastAPI Application
Main entry point for the bias detection API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

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
    
    yield
    
    # Shutdown logic
    logger.info("Shutting down EquityLens API")
    if _weaviate_initialized:
        weaviate_manager.close()


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


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "EquityLens API",
        "version": "0.1.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
