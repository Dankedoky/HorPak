import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv('backend/.env')
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not found")
    sys.exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"Connecting to database...")
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        print("Connected!")
        
        # Select business units
        print("\n=== Business Units ===")
        res = conn.execute(text("SELECT id, name, type FROM business_units"))
        for r in res:
            print(f"ID: {r[0]} | Name: {r[1]} | Type: {r[2]}")
            
        # Select transaction sample
        print("\n=== Recent Transactions ===")
        res = conn.execute(text("SELECT id, type, amount, description, unit_id, expense_category, created_at FROM transactions ORDER BY created_at DESC LIMIT 20"))
        for r in res:
            print(f"ID: {r[0]} | Type: {r[1]} | Amount: {r[2]} | Desc: {r[3]} | Unit: {r[4]} | Cat: {r[5]} | Date: {r[6]}")
            
except Exception as e:
    print("Error querying database:", e)
