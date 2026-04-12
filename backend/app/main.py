"""
EquityLens FastAPI Application
Main entry point for the bias detection API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from app.config import settings
from app.db.session import engine
from app.db.models import Base
from app.routers import datasets, audit, mitigation, simulator, portal, governance, reports, demo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="EquityLens API",
    description="AI Bias Detection and Fairness Platform",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
logger.info("Creating database tables...")
Base.metadata.create_all(bind=engine)

# Register routers
app.include_router(datasets.router)
app.include_router(audit.router)
app.include_router(mitigation.router)
app.include_router(simulator.router)
app.include_router(portal.router)
app.include_router(governance.router)
app.include_router(reports.router)
app.include_router(demo.router)

@app.on_event("startup")
async def startup():
    """Startup event handler."""
    logger.info(f"Starting EquityLens API in {settings.environment} mode")
    logger.info(f"Database: {settings.database_url}")
    logger.info(f"Redis: {settings.redis_url}")

@app.on_event("shutdown")
async def shutdown():
    """Shutdown event handler."""
    logger.info("Shutting down EquityLens API")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": "0.1.0"
    }

@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "EquityLens API",
        "version": "0.1.0",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
