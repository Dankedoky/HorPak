
import sqlite3
import os

db_path = "D:/Dormitory_system/dormitory.db"

if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Add water_meter_prev if it doesn't exist
        try:
            cursor.execute("ALTER TABLE dorm_rooms ADD COLUMN water_meter_prev FLOAT DEFAULT 0.0")
            print("Added water_meter_prev column")
        except sqlite3.OperationalError:
            print("water_meter_prev already exists")
            
        # Add electricity_meter_prev if it doesn't exist
        try:
            cursor.execute("ALTER TABLE dorm_rooms ADD COLUMN electricity_meter_prev FLOAT DEFAULT 0.0")
            print("Added electricity_meter_prev column")
        except sqlite3.OperationalError:
            print("electricity_meter_prev already exists")
            
        conn.commit()
        conn.close()
        print("Database schema update successful!")
    except Exception as e:
        print(f"Error updating database: {e}")
else:
    print(f"Database file not found at {db_path}")
