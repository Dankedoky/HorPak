from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dormitory.db")
APP_ENV = (os.getenv("APP_ENV") or os.getenv("ENV") or "").lower()
IS_PRODUCTION = APP_ENV == "production" or os.getenv("RENDER", "").lower() == "true"

if IS_PRODUCTION and SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    raise RuntimeError("DATABASE_URL must point to PostgreSQL/Supabase in production.")

# Robust database engine initialization with graceful fallback
try:
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
        )
        # Verify SQLite path is writable
        with engine.connect() as conn:
            pass
    else:
        # Attempt PostgreSQL connection with a short timeout
        connect_args = {"connect_timeout": 5}
        if "6543" in SQLALCHEMY_DATABASE_URL:
            # Disable prepared statements for PgBouncer/Supabase Pooler in Transaction Mode
            connect_args["prepare_threshold"] = None
            logger.info("Supabase Pooler (Port 6543) detected. Automatically disabled prepared statements.")
        
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
        with engine.connect() as conn:
            pass
        logger.info("Successfully connected to the primary PostgreSQL database.")
except Exception as e:
    if IS_PRODUCTION:
        logger.error(f"Could not connect to the production database: {e}")
        raise
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        logger.warning(
            f"Could not connect to PostgreSQL ({SQLALCHEMY_DATABASE_URL}). "
            f"Falling back to local SQLite (sqlite:///./dormitory.db). Error: {e}"
        )
        SQLALCHEMY_DATABASE_URL = "sqlite:///./dormitory.db"
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
        )
    else:
        logger.error(f"Critical error initializing database: {e}")
        raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

