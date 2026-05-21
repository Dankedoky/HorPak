
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="D:/Dormitory_system/backend/.env")
db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("DATABASE_URL not found in .env")
    exit(1)

# Fix for Supabase/PostgreSQL URL if needed (e.g. postgresql:// vs postgres://)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)

def add_column(table, column, type_def):
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}"))
            conn.commit()
            print(f"Added column {column} to {table}")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
            print(f"Column {column} in {table} already exists")
        else:
            print(f"Error adding column {column} to {table}: {e}")

if __name__ == "__main__":
    print(f"Connecting to database...")
    # Add columns to dorm_rooms
    add_column("dorm_rooms", "water_meter_prev", "FLOAT DEFAULT 0.0")
    add_column("dorm_rooms", "electricity_meter_prev", "FLOAT DEFAULT 0.0")
    print("Done!")
