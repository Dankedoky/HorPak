import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load env variables
load_dotenv('backend/.env')
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ ERROR: DATABASE_URL not found in backend/.env")
    sys.exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print("⚡ Connecting to Supabase PostgreSQL Database...")
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        print("\n--- 1. Inspecting dorm_payments before deletion ---")
        res = conn.execute(text("SELECT id, room_id, month, amount, water_cost, electric_cost, payment_status FROM dorm_payments ORDER BY id"))
        payments = res.fetchall()
        if not payments:
            print("💡 No payments found in dorm_payments.")
        for p in payments:
            print(f"ID: {p[0]} | Room ID: {p[1]} | Month: {p[2]} | Amount: {p[3]} | Water: {p[4]} | Electric: {p[5]} | Status: {p[6]}")

        # Delete the test row with month = '2026-04'
        print("\n--- 2. Deleting test row with month = '2026-04' (Room 102 test record) ---")
        delete_res = conn.execute(text("DELETE FROM dorm_payments WHERE month = '2026-04'"))
        conn.commit()
        print(f"✅ Success! Row(s) deleted: {delete_res.rowcount}")

        # Inspect transactions
        print("\n--- 3. Checking recent transactions in General Ledger ---")
        t_res = conn.execute(text("SELECT id, type, amount, description, created_at FROM transactions ORDER BY created_at DESC LIMIT 10"))
        transactions = t_res.fetchall()
        if not transactions:
            print("💡 No transactions found in General Ledger.")
        for t in transactions:
            print(f"ID: {t[0]} | Type: {t[1]} | Amount: {t[2]} | Desc: {t[3]} | Date: {t[4]}")

        # Check dorm_payments after deletion
        print("\n--- 4. Inspecting dorm_payments after deletion ---")
        res_after = conn.execute(text("SELECT id, room_id, month, amount, water_cost, electric_cost, payment_status FROM dorm_payments ORDER BY id"))
        payments_after = res_after.fetchall()
        if not payments_after:
            print("✨ Perfect! dorm_payments table is now completely empty (0.00 ฿).")
        for p in payments_after:
            print(f"ID: {p[0]} | Room ID: {p[1]} | Month: {p[2]} | Amount: {p[3]} | Water: {p[4]} | Electric: {p[5]} | Status: {p[6]}")

        print("\n🎉 Database cleanup finished successfully! All test data for April 2026 has been cleared.")

except Exception as e:
    print("❌ ERROR: Database operations failed.")
    print("Details:", e)
