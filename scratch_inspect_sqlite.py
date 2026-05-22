import sqlite3
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

dbs = ["backend/dormitory.db", "dormitory.db"]
for db_path in dbs:
    if os.path.exists(db_path):
        print(f"\n=== Inspecting SQLite: {db_path} ===")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        print("Tables:", tables)
        
        if "business_units" in tables:
            cursor.execute("SELECT id, name, type FROM business_units")
            print("Business Units:")
            for r in cursor.fetchall():
                print(r)
                
        if "transactions" in tables:
            cursor.execute("SELECT count(*) FROM transactions")
            print("Transaction count:", cursor.fetchone()[0])
            
            # Check transaction columns
            cursor.execute("PRAGMA table_info(transactions)")
            cols = [c[1] for c in cursor.fetchall()]
            print("Transaction columns:", cols)
            
            col_list = ", ".join([c for c in ["id", "type", "amount", "description", "unit_id", "expense_category", "created_at"] if c in cols])
            cursor.execute(f"SELECT {col_list} FROM transactions ORDER BY created_at DESC LIMIT 15")
            print("Recent Transactions:")
            for r in cursor.fetchall():
                print(r)
        
        conn.close()
    else:
        print(f"\nPath does not exist: {db_path}")
