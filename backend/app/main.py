"""Main FastAPI application for PiLLM."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.logging import logger
from app.core.exceptions import PiLLMException
from app.db.database import init_db

# Import routers
from app.api.routes_health import router as health_router
from app.api.routes_chats import router as chats_router
from app.api.routes_chat import router as chat_router
from app.api.routes_models import router as models_router
from app.api.routes_system import router as system_router
from app.api.routes_settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle events."""
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    # Initialize SQLite database schema
    await init_db()
    logger.info("PiLLM Backend is ready and listening.")
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS configuration - LAN and local origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|raspberrypi\.local|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(PiLLMException)
async def pillm_exception_handler(request: Request, exc: PiLLMException):
    """Handle custom application exceptions cleanly without tracebacks."""
    logger.error("PiLLM domain error on %s: %s", request.url.path, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "details": exc.details},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler protecting against stack trace leaks."""
    logger.exception("Unhandled server error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please check server logs."},
    )


# Register all API endpoints under /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(chats_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(system_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/api")
async def api_root():
    """API Root index."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": "LOCAL LAN ONLY",
        "docs": "/api/docs",
    }
