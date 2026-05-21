from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dormitory.db")

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
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            pass
        logger.info("Successfully connected to the primary PostgreSQL database.")
except Exception as e:
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

