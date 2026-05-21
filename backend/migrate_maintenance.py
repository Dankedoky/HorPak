import os
import sys
from dotenv import load_dotenv

# Add parent directory and backend directory to path to allow importing models and database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
import models

def run_migration():
    print("Starting database migration for maintenance tickets...")
    try:
        # This will create all tables that do not exist yet (including maintenance_tickets)
        Base.metadata.create_all(bind=engine)
        print("Database migration completed successfully!")
    except Exception as e:
        print(f"Error executing migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
