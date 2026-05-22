import os
import sys
from dotenv import load_dotenv

# Add parent directory and backend directory to path to allow importing models and database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
import models
from sqlalchemy import text

def run_migration():
    print("Starting database migration for utility history tracking...")
    
    # Columns to add
    new_cols = [
        ("water_meter_prev", "DOUBLE PRECISION", "REAL", "0.0"),
        ("water_meter", "DOUBLE PRECISION", "REAL", "0.0"),
        ("electricity_meter_prev", "DOUBLE PRECISION", "REAL", "0.0"),
        ("electricity_meter", "DOUBLE PRECISION", "REAL", "0.0"),
        ("remark", "VARCHAR(500)", "TEXT", "NULL"),
        ("move_out", "VARCHAR(100)", "TEXT", "NULL"),
        ("vacant", "VARCHAR(100)", "TEXT", "NULL")
    ]
    
    # Check if PostgreSQL or SQLite
    is_postgres = not str(engine.url).startswith("sqlite")
    print(f"Database Engine: {'PostgreSQL (Supabase)' if is_postgres else 'SQLite'}")
    
    with engine.connect() as conn:
        for col_name, pg_type, sqlite_type, default_val in new_cols:
            col_type = pg_type if is_postgres else sqlite_type
            try:
                print(f"Adding column {col_name} to dorm_payments...")
                if default_val == "NULL":
                    query = text(f"ALTER TABLE dorm_payments ADD COLUMN {col_name} {col_type};")
                else:
                    query = text(f"ALTER TABLE dorm_payments ADD COLUMN {col_name} {col_type} DEFAULT {default_val};")
                
                # Execute the query
                conn.execute(query)
                # If pg, we should commit
                if is_postgres:
                    conn.execute(text("COMMIT;"))
                print(f"Column {col_name} added successfully.")
            except Exception as e:
                # If error, it probably already exists
                print(f"Column {col_name} could not be added (it might already exist): {e}")
                
    print("Database migration completed successfully!")

if __name__ == "__main__":
    run_migration()
