import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv('backend/.env')
db_url = os.getenv("DATABASE_URL")
print(f"Connecting to database...")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("=== Checking Connection ===")
        print("Successfully connected!")
        
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in result]
        
        if "dorm_rooms" in tables:
            result = conn.execute(text("SELECT COUNT(*) FROM dorm_rooms"))
            print("Total rooms count:", list(result)[0][0])
            
            result = conn.execute(text("SELECT COUNT(*) FROM dorm_rooms WHERE tenant != '' AND tenant IS NOT NULL"))
            print("Occupied rooms count:", list(result)[0][0])
            
            result = conn.execute(text("SELECT id, number, remark, payment_status FROM dorm_rooms WHERE tenant != '' AND tenant IS NOT NULL LIMIT 10"))
            print("Occupied Rooms sample (Non-Thai fields):")
            for row in result:
                # check if tenant exists and remark starts with U
                remark_val = row[2] if row[2] else "None"
                print(f"Room ID: {row[0]}, Number: {row[1]}, LINE ID: {remark_val}, Payment Status: {row[3]}")
                
        if "customers" in tables:
            result = conn.execute(text("SELECT COUNT(*) FROM customers"))
            print("Total customers count:", list(result)[0][0])
            
            result = conn.execute(text("SELECT id, line_user_id FROM customers WHERE line_user_id IS NOT NULL AND line_user_id != ''"))
            print("Customers with LINE ID (Non-Thai fields):")
            for row in result:
                print(f"Customer ID: {row[0]}, LINE ID: {row[1]}")
except Exception as e:
    print("Error:", e)
