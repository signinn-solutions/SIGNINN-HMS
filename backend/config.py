import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BASE_DIR.parent

# Load environment variables from project root .env
load_dotenv(WORKSPACE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'signinn.db'}")
SECRET_KEY = os.getenv("SECRET_KEY", "signinn-super-secret-production-key-2026")
DEFAULT_TENANT_ID = os.getenv("DEFAULT_TENANT_ID", "tenant-1")

# Aiosell Environment Settings
AIOSELL_BASE_URL = os.getenv("AIOSELL_BASE_URL", "https://live.aiosell.com/api/v2/cm")
AIOSELL_USERNAME = os.getenv("AIOSELL_USERNAME", "")
AIOSELL_PASSWORD = os.getenv("AIOSELL_PASSWORD", "")
AIOSELL_HOTEL_CODE = os.getenv("AIOSELL_HOTEL_CODE", "")
AIOSELL_PARTNER_ID = os.getenv("AIOSELL_PARTNER_ID", "")
AIOSELL_PROPERTY_ID = os.getenv("AIOSELL_PROPERTY_ID", "")

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*",
]
