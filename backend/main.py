import sys
from pathlib import Path

# Ensure root directory is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import CORS_ORIGINS
from backend.database import engine, Base
from backend.seed import seed_database

# Routers
from backend.routers import (
    auth,
    tenants,
    properties,
    rooms,
    reservations,
    guests,
    billing,
    housekeeping,
    maintenance,
    channels,
    rates,
    audit,
    messages,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and seed data
    print("FastAPI startup: Initializing database and verifying seed data...")
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
    # Shutdown logic if any
    print("FastAPI shutdown.")


app = FastAPI(
    title="SIGNINN HMS Multi-Tenant API",
    description="Enterprise Hotel Management Operating System - Multi-Tenant SaaS Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(properties.router)
app.include_router(rooms.router)
app.include_router(reservations.router)
app.include_router(guests.router)
app.include_router(billing.router)
app.include_router(housekeeping.router)
app.include_router(maintenance.router)
app.include_router(channels.router)
app.include_router(rates.router)
app.include_router(audit.router)
app.include_router(messages.router)

# Direct Aiosell Webhook route per Aiosell standard specification (/update_reservation)
app.add_api_route(
    "/update_reservation",
    channels.aiosell_inbound_webhook,
    methods=["POST"],
    tags=["OTA Channel Manager"],
)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "signinn-hms-backend"}


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve built React frontend if dist directory exists
dist_dir = Path(__file__).resolve().parent.parent / "dist"
if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = dist_dir / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "system": "SIGNINN HMS",
            "status": "Operational",
            "version": "1.0.0",
            "docs": "/docs",
        }

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting SIGNINN HMS FastAPI Backend on http://127.0.0.1:{port} ...")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=port, reload=True)
