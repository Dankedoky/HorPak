from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from dotenv import load_dotenv
import re
import io
from datetime import datetime, date, time, timedelta
import models, schemas, database
from auth import create_token, LoginRequest, get_current_user
from database import engine, get_db
from linebot.v3 import WebhookParser
from linebot.v3.messaging import Configuration, AsyncApiClient, AsyncMessagingApi, ReplyMessageRequest, TextMessage
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.webhooks import MessageEvent, TextMessageContent

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

models.Base.metadata.create_all(bind=engine)

# LINE Config
channel_secret = os.getenv("LINE_CHANNEL_SECRET")
channel_access_token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
parser = WebhookParser(channel_secret) if channel_secret else None

_line_bot_api = None

def get_line_bot_api() -> AsyncMessagingApi:
    global _line_bot_api
    if _line_bot_api is None:
        configuration = Configuration(access_token=channel_access_token)
        async_api_client = AsyncApiClient(configuration)
        _line_bot_api = AsyncMessagingApi(async_api_client)
    return _line_bot_api


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Sovereign Accounting API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Auth Endpoint
# ==========================================
@app.post("/auth/login")
def login(req: LoginRequest):
    admin_password = os.getenv('ADMIN_PASSWORD')
    if not admin_password:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD is not configured on the server")
    if req.password != admin_password:
        raise HTTPException(status_code=401, detail="รหัสผ่านไม่ถูกต้อง")
    token = create_token({"role": "admin"})
    return {"access_token": token, "token_type": "bearer"}

@app.on_event("startup")
def seed_business_units():
    # Schema check and self-healing
    db = next(get_db())
    schema_mismatch = False
    try:
        # Check if new columns exist by running a query
        db.query(models.DormRoom).first()
        db.query(models.RentalHouse).first()
        db.query(models.DormPayment).first()
        db.query(models.HousePayment).first()
    except Exception as e:
        err_str = str(e).lower()
        if "column" in err_str or "does not exist" in err_str or "no such column" in err_str or "relation" in err_str or "table" in err_str:
            schema_mismatch = True
            print(f"Database schema mismatch detected: {e}. Initiating self-healing...")
    finally:
        db.close()

    if schema_mismatch:
        try:
            # Drop and recreate tables to heal schema
            models.Base.metadata.drop_all(bind=engine)
            models.Base.metadata.create_all(bind=engine)
            print("Self-healing database schema completed successfully.")
        except Exception as err:
            print(f"Critical error during database self-healing: {err}")

    db = next(get_db())
    try:
        if db.query(models.BusinessUnit).count() == 0:
            units = [
                {"name": "หอพัก", "type": models.UnitType.DORMITORY},
                {"name": "อู่ซ่อมรถ", "type": models.UnitType.GARAGE},
                {"name": "บ้านเช่า หลังที่ 1", "type": models.UnitType.HOUSE},
                {"name": "บ้านเช่า หลังที่ 2", "type": models.UnitType.HOUSE},
                {"name": "บ้านเช่า หลังที่ 3", "type": models.UnitType.HOUSE},
            ]
            for unit in units:
                db.add(models.BusinessUnit(**unit))
            db.commit()
            print("Successfully seeded 5 default Business Units.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding business units: {e}")
    finally:
        db.close()
    
    # Seed DormRooms and Houses
    seed_rooms_and_houses()

def seed_rooms_and_houses():
    db = next(get_db())
    try:
        # Seed DormRooms
        if db.query(models.DormRoom).count() == 0:
            rooms = []
            
            # 26_20
            rooms_26_20 = [
                {"number": "401", "rate": 2800, "floor": 4}, 
                {"number": "402", "rate": 2500, "floor": 4},
                {"number": "403", "rate": 2500, "floor": 4}, {"number": "404", "rate": 2200, "floor": 4},
                {"number": "405", "rate": 2500, "floor": 4}, {"number": "406", "rate": 2500, "floor": 4},
                {"number": "301", "rate": 2800, "floor": 3}, 
                {"number": "302", "rate": 2500, "floor": 3},
                {"number": "303", "rate": 2500, "floor": 3}, {"number": "304", "rate": 3000, "floor": 3},
                {"number": "305", "rate": 2800, "floor": 3}, {"number": "306", "rate": 2800, "floor": 3},
                {"number": "307", "rate": 3000, "floor": 3},
                {"number": "201", "rate": 3000, "floor": 2}, {"number": "202", "rate": 2800, "floor": 2},
                {"number": "203", "rate": 2800, "floor": 2}, {"number": "204", "rate": 3000, "floor": 2},
                {"number": "205", "rate": 2800, "floor": 2}, {"number": "206", "rate": 2500, "floor": 2},
                {"number": "207", "rate": 2700, "floor": 2},
                {"number": "101", "rate": 2500, "floor": 1}, {"number": "102", "rate": 2500, "floor": 1},
                {"number": "103", "rate": 2500, "floor": 1}, {"number": "104", "rate": 2500, "floor": 1},
            ]
            for r in rooms_26_20:
                rooms.append(models.DormRoom(
                    dorm_key="26_20",
                    number=r["number"],
                    floor=r["floor"],
                    rate=float(r["rate"]),
                    tenant="",
                    payment_status="vacant",
                    deposit=0.0,
                    lease_status="active"
                ))

            # 26_577
            # Floor 3: 301 to 310
            for i in range(1, 11):
                rooms.append(models.DormRoom(
                    dorm_key="26_577",
                    number=f"3{str(i).zfill(2)}",
                    floor=3,
                    rate=2500.0,
                    tenant="",
                    payment_status="vacant"
                ))
            # Floor 2: 201 to 210
            for i in range(1, 11):
                rooms.append(models.DormRoom(
                    dorm_key="26_577",
                    number=f"2{str(i).zfill(2)}",
                    floor=2,
                    rate=2500.0,
                    tenant="",
                    payment_status="vacant"
                ))
            # Floor 1
            rooms_26_577_f1 = [
                {"number": "101", "rate": 2500, "floor": 1}, 
                {"number": "102", "rate": 2500, "floor": 1},
                {"number": "103", "rate": 2500, "floor": 1}, {"number": "104", "rate": 2000, "floor": 1},
                {"number": "105", "rate": 2500, "floor": 1}, {"number": "106", "rate": 2500, "floor": 1},
                {"number": "107", "rate": 2500, "floor": 1}, {"number": "108", "rate": 2500, "floor": 1},
                {"number": "109", "rate": 2500, "floor": 1}, {"number": "110", "rate": 2500, "floor": 1},
            ]
            for r in rooms_26_577_f1:
                rooms.append(models.DormRoom(
                    dorm_key="26_577",
                    number=r["number"],
                    floor=r["floor"],
                    rate=float(r["rate"]),
                    tenant="",
                    payment_status="vacant",
                    deposit=0.0,
                    lease_status="active"
                ))

            # 73_17
            # Floor 2: B1 to B9
            for i in range(1, 10):
                rooms.append(models.DormRoom(
                    dorm_key="73_17",
                    number=f"B{i}",
                    floor=2,
                    rate=3500.0,
                    tenant="",
                    payment_status="vacant"
                ))
            # Floor 1: A1 to A8
            for i in range(1, 9):
                rooms.append(models.DormRoom(
                    dorm_key="73_17",
                    number=f"A{i}",
                    floor=1,
                    rate=3500.0,
                    tenant="",
                    payment_status="vacant"
                ))

            for r in rooms:
                db.add(r)
            db.commit()
            print(f"Successfully seeded {len(rooms)} Dormitory Rooms.")

        # Seed RentalHouses
        if db.query(models.RentalHouse).count() == 0:
            houses = [
                models.RentalHouse(id="h1", name="บ้านเช่า หลังที่ 1", tenant_name="", monthly_rent=5000.0, payment_status="unpaid", deposit=0.0, lease_status="active"),
                models.RentalHouse(id="h2", name="บ้านเช่า หลังที่ 2", tenant_name="", monthly_rent=4500.0, payment_status="unpaid", deposit=0.0, lease_status="active"),
                models.RentalHouse(id="h3", name="บ้านเช่า หลังที่ 3", tenant_name="", monthly_rent=6000.0, payment_status="unpaid", deposit=0.0, lease_status="active"),
            ]
            for h in houses:
                db.add(h)
            db.commit()
            print("Successfully seeded 3 default Rental Houses.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding rooms and houses: {e}")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Sovereign Accounting API"}

# Business Units
@app.post("/units/", response_model=schemas.BusinessUnit)
def create_unit(unit: schemas.BusinessUnitCreate, db: Session = Depends(get_db)):
    db_unit = models.BusinessUnit(**unit.dict())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

@app.get("/units/", response_model=List[schemas.BusinessUnit])
def read_units(db: Session = Depends(get_db)):
    return db.query(models.BusinessUnit).all()

# Customers
@app.post("/customers/", response_model=schemas.Customer)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    db_customer = models.Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.get("/customers/", response_model=List[schemas.Customer])
def read_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).all()

@app.patch("/customers/{customer_id}/", response_model=schemas.Customer)
def update_customer(customer_id: int, customer_update: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.delete("/customers/{customer_id}/")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(db_customer)
    db.commit()
    return {"status": "success", "message": "Customer deleted successfully"}

# Invoices
@app.post("/invoices/", response_model=schemas.Invoice)
def create_invoice(invoice: schemas.InvoiceCreate, db: Session = Depends(get_db)):
    db_invoice = models.Invoice(**invoice.dict())
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice

@app.get("/invoices/", response_model=List[schemas.Invoice])
def read_invoices(db: Session = Depends(get_db)):
    return db.query(models.Invoice).all()

@app.patch("/invoices/{invoice_id}/status", response_model=schemas.Invoice)
def update_invoice_status(invoice_id: int, status: str, db: Session = Depends(get_db)):
    db_invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    try:
        db_invoice.status = models.InvoiceStatus(status.lower())
        db.commit()
        db.refresh(db_invoice)
        
        if status.lower() == "paid":
            ref_id = f"invoice_payment_{db_invoice.id}"
            existing_tx = db.query(models.Transaction).filter(models.Transaction.reference_id == ref_id).first()
            if not existing_tx:
                db_tx = models.Transaction(
                    type=models.TransactionType.INCOME,
                    amount=db_invoice.amount,
                    description=f"รับชำระบิล: {db_invoice.title} (บิล ID: {db_invoice.id})",
                    reference_id=ref_id,
                    unit_id=db_invoice.unit_id,
                    customer_id=db_invoice.customer_id
                )
                db.add(db_tx)
                db.commit()
        
        return db_invoice
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invoice status")

# Transactions
@app.post("/transactions/", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = models.Transaction(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.get("/transactions/", response_model=List[schemas.Transaction])
def read_transactions(db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.created_at.desc()).all()

from sqlalchemy import func

@app.get("/transactions/summary", response_model=schemas.DashboardSummary)
def get_transaction_summary(db: Session = Depends(get_db)):
    totals = db.query(
        models.Transaction.type,
        func.sum(models.Transaction.amount)
    ).group_by(models.Transaction.type).all()
    
    total_income = next((float(t[1]) for t in totals if t[0] == models.TransactionType.INCOME), 0.0)
    total_expense = next((float(t[1]) for t in totals if t[0] == models.TransactionType.EXPENSE), 0.0)
    balance = total_income - total_expense
    
    unit_totals = db.query(
        models.Transaction.unit_id,
        models.Transaction.type,
        func.sum(models.Transaction.amount)
    ).group_by(models.Transaction.unit_id, models.Transaction.type).all()
    
    units = db.query(models.BusinessUnit).all()
    unit_summaries = []
    
    for u in units:
        u_income = sum(float(t[2]) for t in unit_totals if t[0] == u.id and t[1] == models.TransactionType.INCOME)
        u_expense = sum(float(t[2]) for t in unit_totals if t[0] == u.id and t[1] == models.TransactionType.EXPENSE)
        unit_summaries.append(
            schemas.BusinessUnitSummary(
                id=u.id,
                name=u.name,
                type=u.type,
                total_income=u_income,
                total_expense=u_expense,
                balance=u_income - u_expense
            )
        )
        
    return schemas.DashboardSummary(
        total_income=total_income,
        total_expense=total_expense,
        balance=balance,
        units=unit_summaries
    )

# ==========================================
# Export Excel Endpoint
# ==========================================
@app.get("/transactions/export/excel")
def export_transactions_excel(db: Session = Depends(get_db)):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    
    transactions = db.query(models.Transaction).order_by(models.Transaction.created_at.desc()).all()
    units = db.query(models.BusinessUnit).all()
    unit_map = {u.id: u.name for u in units}
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "รายการบัญชี"
    
    header_font = Font(bold=True, color="FFFFFF", size=12)
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    
    headers = ["ลำดับ", "วันที่", "ประเภท", "จำนวนเงิน (บาท)", "รายละเอียด", "ธุรกิจ"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = thin_border
    
    income_fill = PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid")
    expense_fill = PatternFill(start_color="FFEBEE", end_color="FFEBEE", fill_type="solid")
    
    for idx, tx in enumerate(transactions, 1):
        row = idx + 1
        tx_type = "รายรับ" if tx.type == models.TransactionType.INCOME else "รายจ่าย"
        unit_name = unit_map.get(tx.unit_id, "ทั่วไป")
        date_str = tx.created_at.strftime("%d/%m/%Y %H:%M") if tx.created_at else ""
        fill = income_fill if tx.type == models.TransactionType.INCOME else expense_fill
        
        data = [idx, date_str, tx_type, float(tx.amount), tx.description, unit_name]
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row, column=col, value=value)
            cell.border = thin_border
            cell.fill = fill
            if col == 4:
                cell.number_format = '#,##0.00'
                cell.alignment = Alignment(horizontal='right')
    
    for col in ws.columns:
        max_length = max(len(str(cell.value or '')) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_length + 4, 40)
    
    total_income = sum(float(tx.amount) for tx in transactions if tx.type == models.TransactionType.INCOME)
    total_expense = sum(float(tx.amount) for tx in transactions if tx.type == models.TransactionType.EXPENSE)
    last_row = len(transactions) + 2
    ws.cell(row=last_row, column=3, value="รวมรายรับ:").font = Font(bold=True)
    ws.cell(row=last_row, column=4, value=total_income).font = Font(bold=True, color="228B22")
    ws.cell(row=last_row, column=4).number_format = '#,##0.00'
    ws.cell(row=last_row+1, column=3, value="รวมรายจ่าย:").font = Font(bold=True)
    ws.cell(row=last_row+1, column=4, value=total_expense).font = Font(bold=True, color="FF0000")
    ws.cell(row=last_row+1, column=4).number_format = '#,##0.00'
    ws.cell(row=last_row+2, column=3, value="คงเหลือสุทธิ:").font = Font(bold=True)
    ws.cell(row=last_row+2, column=4, value=total_income - total_expense).font = Font(bold=True, color="1F4E79")
    ws.cell(row=last_row+2, column=4).number_format = '#,##0.00'
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"sovereign_transactions_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/transactions/monthly-summary")
def get_monthly_summary(db: Session = Depends(get_db)):
    six_months_ago = datetime.now() - timedelta(days=180)
    
    transactions = db.query(models.Transaction).filter(
        models.Transaction.created_at >= six_months_ago
    ).all()
    
    monthly_data = {}
    for tx in transactions:
        if tx.created_at:
            key = tx.created_at.strftime("%Y-%m")
            if key not in monthly_data:
                monthly_data[key] = {"month": key, "income": 0.0, "expense": 0.0}
            if tx.type == models.TransactionType.INCOME:
                monthly_data[key]["income"] += float(tx.amount)
            else:
                monthly_data[key]["expense"] += float(tx.amount)
    
    result = sorted(monthly_data.values(), key=lambda x: x["month"])
    return result[-6:] if len(result) > 6 else result

def match_business_unit(description: str, db: Session) -> Optional[models.BusinessUnit]:
    units = db.query(models.BusinessUnit).all()
    if not units:
        return None
    desc_lower = description.lower()
    
    if any(k in desc_lower for k in ["อู่", "ซ่อม", "garage", "รถ", "ตู้"]):
        for u in units:
            if u.type == models.UnitType.GARAGE:
                return u
    if any(k in desc_lower for k in ["บ้าน", "house"]):
        for i in range(1, 4):
            if any(k in desc_lower for k in [str(i), f"หลังที่ {i}", f"หลัง {i}"]):
                for u in units:
                    if f"หลังที่ {i}" in u.name:
                        return u
        for u in units:
            if u.type == models.UnitType.HOUSE:
                return u
    if any(k in desc_lower for k in ["หอ", "dorm", "ห้อง", "b20", "b577", "a20"]):
        for u in units:
            if u.type == models.UnitType.DORMITORY:
                return u
    return None

@app.post("/webhook")
async def line_webhook(request: Request, db: Session = Depends(get_db)):
    signature = request.headers.get('X-Line-Signature')
    body = await request.body()
    body_str = body.decode('utf-8')

    try:
        events = parser.parse(body_str, signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    for event in events:
        if not isinstance(event, MessageEvent) or not isinstance(event.message, TextMessageContent):
            continue
        
        user_id = event.source.user_id
        text = event.message.text.strip()

        if text == "เช็คยอด":
            customer = db.query(models.Customer).filter(models.Customer.line_user_id == user_id).first()
            if not customer:
                reply_text = "ขออภัยครับ ไม่พบข้อมูลของคุณในระบบ กรุณาแจ้งแอดมินเพื่อผูกบัญชี LINE ครับ"
            else:
                unpaid_invoices = [i for i in customer.invoices if i.status == models.InvoiceStatus.UNPAID]
                if not unpaid_invoices:
                    reply_text = f"สวัสดีครับคุณ {customer.name}\nคุณไม่มียอดค้างชำระครับ"
                else:
                    total = sum(i.amount for i in unpaid_invoices)
                    details = "\n".join([f"- {i.title}: {i.amount:,.2f} บาท" for i in unpaid_invoices])
                    reply_text = f"สวัสดีครับคุณ {customer.name}\nยอดค้างชำระทั้งหมด: {total:,.2f} บาท\n\nรายละเอียด:\n{details}"
            await get_line_bot_api().reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text=reply_text)]))
            continue

        if text == "สรุปวันนี้":
            today_start = datetime.combine(date.today(), time.min)
            today_end = datetime.combine(date.today(), time.max)
            today_tx = db.query(models.Transaction).filter(models.Transaction.created_at >= today_start, models.Transaction.created_at <= today_end).all()
            total_inc = sum(t.amount for t in today_tx if t.type == models.TransactionType.INCOME)
            total_exp = sum(t.amount for t in today_tx if t.type == models.TransactionType.EXPENSE)
            reply_text = f"📅 สรุปยอดบัญชีวันนี้\n📈 รายรับรวม: +{total_inc:,.2f} บาท\n📉 รายจ่ายรวม: -{total_exp:,.2f} บาท\n💰 คงเหลือสุทธิ: {total_inc - total_exp:,.2f} บาท"
            await get_line_bot_api().reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text=reply_text)]))
            continue

        if text == "ยอดเงิน":
            units = db.query(models.BusinessUnit).all()
            transactions = db.query(models.Transaction).all()
            total_inc_all = sum(t.amount for t in transactions if t.type == models.TransactionType.INCOME)
            total_exp_all = sum(t.amount for t in transactions if t.type == models.TransactionType.EXPENSE)
            lines = [f"🏢 {u.name}: {(sum(t.amount for t in transactions if t.unit_id == u.id and t.type == models.TransactionType.INCOME) - sum(t.amount for t in transactions if t.unit_id == u.id and t.type == models.TransactionType.EXPENSE)):,.2f} บาท" for u in units]
            reply_text = f"💰 ยอดเงินคงเหลือแต่ละธุรกิจ\n{chr(10).join(lines)}\n💵 ยอดรวมทั้งหมด: {total_inc_all - total_exp_all:,.2f} บาท"
            await get_line_bot_api().reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text=reply_text)]))
            continue

        if text == "ทวงบิล":
            unpaid_rooms = db.query(models.DormRoom).filter(models.DormRoom.payment_status != "paid", models.DormRoom.tenant != "", models.DormRoom.tenant != None).all()
            unpaid_houses = db.query(models.RentalHouse).filter(models.RentalHouse.payment_status != "paid", models.RentalHouse.tenant_name != "", models.RentalHouse.tenant_name != None).all()
            unpaid_jobs = db.query(models.GarageJob).filter(models.GarageJob.payment_status != "paid").all()
            lines = ["🔔 สรุปบิลค้างชำระ"]
            if unpaid_rooms:
                lines.append(f"\n🏢 หอพัก ({len(unpaid_rooms)} ห้อง):")
                for r in unpaid_rooms[:15]: lines.append(f"  ห้อง {r.number} - {r.tenant}: {(r.rate + r.water_cost + r.electric_cost + r.cleaning_fee + r.other_fee + r.fine_cost):,.0f}฿")
            if unpaid_houses:
                lines.append(f"\n🏠 บ้านเช่า ({len(unpaid_houses)} หลัง):")
                for h in unpaid_houses: lines.append(f"  {h.name} - {h.tenant_name}: {(h.monthly_rent + h.water_bill + h.electric_bill):,.0f}฿")
            if unpaid_jobs:
                lines.append(f"\n🔧 อู่ซ่อมรถ ({len(unpaid_jobs)} งาน):")
                for j in unpaid_jobs[:10]: lines.append(f"  {j.license_plate} ({j.customer_name}): {j.total_cost:,.0f}฿")
            if not (unpaid_rooms or unpaid_houses or unpaid_jobs): lines.append("\n✅ ไม่มีบิลค้างชำระครับ!")
            await get_line_bot_api().reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text=chr(10).join(lines))]))
            continue

        match = re.match(r'^(รับ|จ่าย)\s+(\d+(?:\.\d+)?)\s+(.*)$', text, re.IGNORECASE)
        if match:
            action, amount, description = match.group(1).lower(), float(match.group(2)), match.group(3).strip()
            tx_type = models.TransactionType.INCOME if action == "รับ" else models.TransactionType.EXPENSE
            unit = match_business_unit(description, db)
            db_tx = models.Transaction(type=tx_type, amount=amount, description=description, unit_id=unit.id if unit else None)
            db.add(db_tx); db.commit(); db.refresh(db_tx)
            reply_text = f"✅ บันทึก{'รายรับ' if action == 'รับ' else 'รายจ่าย'}สำเร็จ!\n💰 จำนวนเงิน: {amount:,.2f} บาท\n📝 รายละเอียด: {description}\n🏢 ธุรกิจ: {unit.name if unit else 'ทั่วไป'}"
            await get_line_bot_api().reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text=reply_text)]))
            continue

    return {"status": "ok"}

@app.post("/notify/billing-reminder")
def send_billing_reminder(db: Session = Depends(get_db)):
    unpaid_rooms = db.query(models.DormRoom).filter(models.DormRoom.payment_status != "paid", models.DormRoom.tenant != "", models.DormRoom.tenant != None).all()
    unpaid_houses = db.query(models.RentalHouse).filter(models.RentalHouse.payment_status != "paid", models.RentalHouse.tenant_name != "", models.RentalHouse.tenant_name != None).all()
    unpaid_jobs = db.query(models.GarageJob).filter(models.GarageJob.payment_status != "paid").all()
    return {
        "status": "success", "unpaid_rooms": len(unpaid_rooms), "unpaid_houses": len(unpaid_houses), "unpaid_jobs": len(unpaid_jobs),
        "total_unpaid": len(unpaid_rooms) + len(unpaid_houses) + len(unpaid_jobs)
    }

# Dormitory Endpoints
@app.get("/rooms/", response_model=List[schemas.DormRoom])
def read_rooms(db: Session = Depends(get_db)):
    return db.query(models.DormRoom).order_by(models.DormRoom.number.asc()).all()

@app.patch("/rooms/{dorm_key}/{number}/", response_model=schemas.DormRoom)
def update_room(dorm_key: str, number: str, room_update: schemas.DormRoomUpdate, db: Session = Depends(get_db)):
    print(f"DEBUG: Received update request for room {number} in {dorm_key}")
    print(f"DEBUG: Payload: {room_update.dict(exclude_unset=True)}")
    room = db.query(models.DormRoom).filter(models.DormRoom.dorm_key == dorm_key, models.DormRoom.number == number).first()
    if not room: raise HTTPException(status_code=404, detail="Room not found")
    old_status = room.payment_status
    try:
        for key, value in room_update.dict(exclude_unset=True).items(): 
            setattr(room, key, value)
        db.commit(); db.refresh(room)
        print(f"DEBUG: Update successful for room {number}")
    except Exception as e:
        db.rollback()
        print(f"DEBUG: Error updating room: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    if room.payment_status == "paid" and old_status != "paid" and room.tenant:
        total_bill = room.rate + room.water_cost + room.electric_cost + room.cleaning_fee + room.other_fee + room.fine_cost
        if total_bill > 0:
            unit = db.query(models.BusinessUnit).filter(models.BusinessUnit.type == models.UnitType.DORMITORY).first()
            current_month_key = datetime.now().strftime("%Y-%m")
            ref_id = f"dorm_payment_{room.id}_{current_month_key}"
            if not db.query(models.Transaction).filter(models.Transaction.reference_id == ref_id).first():
                db.add(models.Transaction(type=models.TransactionType.INCOME, amount=total_bill, description=f"ค่าเช่าห้อง {room.number} รอบเดือน {current_month_key} - {room.tenant}", reference_id=ref_id, unit_id=unit.id if unit else None))
            if not db.query(models.DormPayment).filter(models.DormPayment.room_id == room.id, models.DormPayment.month == current_month_key).first():
                db.add(models.DormPayment(room_id=room.id, month=current_month_key, amount=room.rate, water_cost=room.water_cost, electric_cost=room.electric_cost, cleaning_fee=room.cleaning_fee, other_fee=room.other_fee, fine_cost=room.fine_cost, payment_status="paid", paid_at=datetime.utcnow()))
            db.commit()
    return room

@app.post("/rooms/rollover/")
def rollover_rooms(db: Session = Depends(get_db)):
    rooms = db.query(models.DormRoom).all()
    for r in rooms:
        # Move current meters to previous
        r.water_meter_prev = r.water_meter
        r.electricity_meter_prev = r.electricity_meter
        # Reset costs and status for new month
        r.water_cost = 0.0; r.electric_cost = 0.0; r.cleaning_fee = 0.0; r.other_fee = 0.0; r.late_days = 0; r.fine_cost = 0.0
        r.payment_status = "pending"; r.payment_date = ""; r.remark = ""; r.move_out = ""; r.vacant = ""
    db.commit()
    return {"status": "success", "message": "ขึ้นรอบบิลใหม่เรียบร้อย!"}

@app.post("/rooms/reset/")
def reset_rooms(db: Session = Depends(get_db)):
    db.close()
    models.Base.metadata.drop_all(bind=engine); models.Base.metadata.create_all(bind=engine)
    seed_business_units(); seed_rooms_and_houses()
    return {"status": "success", "message": "รีเซ็ตข้อมูลทั้งหมดเรียบร้อยแล้ว!"}

# Garage Endpoints
@app.get("/garage/jobs/", response_model=List[schemas.GarageJob])
def read_garage_jobs(db: Session = Depends(get_db)):
    return db.query(models.GarageJob).order_by(models.GarageJob.created_at.desc()).all()

@app.post("/garage/jobs/", response_model=schemas.GarageJob)
def create_garage_job(job: schemas.GarageJobCreate, db: Session = Depends(get_db)):
    db_job = models.GarageJob(**job.dict())
    db.add(db_job); db.commit(); db.refresh(db_job)
    return db_job

@app.patch("/garage/jobs/{job_id}/", response_model=schemas.GarageJob)
def update_garage_job(job_id: int, job_update: schemas.GarageJobUpdate, db: Session = Depends(get_db)):
    db_job = db.query(models.GarageJob).filter(models.GarageJob.id == job_id).first()
    if not db_job: raise HTTPException(status_code=404, detail="Job not found")
    old_status = db_job.payment_status
    for key, value in job_update.dict(exclude_unset=True).items(): setattr(db_job, key, value)
    if db_job.status in ["finished", "picked_up"] and not db_job.finished_at: db_job.finished_at = datetime.utcnow()
    db.commit(); db.refresh(db_job)
    if db_job.payment_status == "paid" and old_status != "paid" and db_job.total_cost > 0:
        unit = db.query(models.BusinessUnit).filter(models.BusinessUnit.type == models.UnitType.GARAGE).first()
        ref_id = f"garage_payment_{db_job.id}"
        if not db.query(models.Transaction).filter(models.Transaction.reference_id == ref_id).first():
            db.add(models.Transaction(type=models.TransactionType.INCOME, amount=db_job.total_cost, description=f"ค่าซ่อมรถ {db_job.license_plate}", reference_id=ref_id, unit_id=unit.id if unit else None))
            db.commit()
    return db_job

@app.delete("/garage/jobs/{job_id}/")
def delete_garage_job(job_id: int, db: Session = Depends(get_db)):
    db_job = db.query(models.GarageJob).filter(models.GarageJob.id == job_id).first()
    if not db_job: raise HTTPException(status_code=404, detail="Job not found")
    db.delete(db_job); db.commit()
    return {"status": "success"}

# Rental House Endpoints
@app.get("/houses/", response_model=List[schemas.RentalHouse])
def read_rental_houses(db: Session = Depends(get_db)):
    return db.query(models.RentalHouse).all()

@app.patch("/houses/{house_id}/", response_model=schemas.RentalHouse)
def update_rental_house(house_id: str, house_update: schemas.RentalHouseUpdate, db: Session = Depends(get_db)):
    db_house = db.query(models.RentalHouse).filter(models.RentalHouse.id == house_id).first()
    if not db_house: raise HTTPException(status_code=404, detail="House not found")
    old_status = db_house.payment_status
    for key, value in house_update.dict(exclude_unset=True).items(): setattr(db_house, key, value)
    db.commit(); db.refresh(db_house)
    if db_house.payment_status == "paid" and old_status != "paid" and db_house.tenant_name:
        total = db_house.monthly_rent + db_house.water_bill + db_house.electric_bill
        if total > 0:
            unit = db.query(models.BusinessUnit).filter(models.BusinessUnit.name == db_house.name).first() or db.query(models.BusinessUnit).filter(models.BusinessUnit.type == models.UnitType.HOUSE).first()
            current_month_key = datetime.now().strftime("%Y-%m")
            ref_id = f"house_payment_{db_house.id}_{current_month_key}"
            if not db.query(models.Transaction).filter(models.Transaction.reference_id == ref_id).first():
                db.add(models.Transaction(type=models.TransactionType.INCOME, amount=total, description=f"ค่าเช่าบ้าน {db_house.name} รอบ {current_month_key}", reference_id=ref_id, unit_id=unit.id if unit else None))
            if not db.query(models.HousePayment).filter(models.HousePayment.house_id == db_house.id, models.HousePayment.month == current_month_key).first():
                db.add(models.HousePayment(house_id=db_house.id, month=current_month_key, amount=db_house.monthly_rent, water_bill=db_house.water_bill, electric_bill=db_house.electric_bill, payment_status="paid", paid_at=datetime.utcnow()))
            db.commit()
    return db_house

# Lease Agreement Endpoints
@app.get("/leases/expiring/")
def get_expiring_leases(db: Session = Depends(get_db)):
    rooms = db.query(models.DormRoom).filter(models.DormRoom.lease_end_date != None).all()
    houses = db.query(models.RentalHouse).filter(models.RentalHouse.lease_end_date != None).all()
    expiring = []
    today = datetime.now()
    for r in rooms:
        if not r.lease_end_date: continue
        try:
            # r.lease_end_date is already a datetime object from SQLAlchemy
            end_date = r.lease_end_date
            days = (end_date - today).days
            if days <= 30:
                expiring.append({
                    "id": f"room_{r.id}", "type": "dormitory", "target_name": f"ห้อง {r.number}",
                    "tenant_name": r.tenant or "ไม่มีผู้เช่า",
                    "start_date": r.lease_start_date.strftime("%Y-%m-%d") if r.lease_start_date else None,
                    "end_date": r.lease_end_date.strftime("%Y-%m-%d"),
                    "deposit": r.deposit, "days_left": days,
                    "status": "หมดอายุ" if days < 0 else f"เหลือ {days} วัน"
                })
        except Exception as e:
            print(f"Error processing room lease {r.number}: {e}")
            pass
    for h in houses:
        if not h.lease_end_date: continue
        try:
            end_date = h.lease_end_date
            days = (end_date - today).days
            if days <= 30:
                expiring.append({
                    "id": f"house_{h.id}", "type": "house", "target_name": h.name,
                    "tenant_name": h.tenant_name or "ไม่มีผู้เช่า",
                    "start_date": h.lease_start_date.strftime("%Y-%m-%d") if h.lease_start_date else None,
                    "end_date": h.lease_end_date.strftime("%Y-%m-%d"),
                    "deposit": h.deposit, "days_left": days,
                    "status": "หมดอายุ" if days < 0 else f"เหลือ {days} วัน"
                })
        except Exception as e:
            print(f"Error processing house lease {h.name}: {e}")
            pass
    return expiring

# Payment History
@app.get("/houses/{house_id}/payments/", response_model=List[schemas.HousePayment])
def get_house_payments(house_id: str, db: Session = Depends(get_db)):
    return db.query(models.HousePayment).filter(models.HousePayment.house_id == house_id).order_by(models.HousePayment.month.desc()).all()

@app.get("/dorm-rooms/{room_id}/payments/", response_model=List[schemas.DormPayment])
def get_room_payments(room_id: int, db: Session = Depends(get_db)):
    return db.query(models.DormPayment).filter(models.DormPayment.room_id == room_id).order_by(models.DormPayment.month.desc()).all()

# Business Unit Management
@app.get("/business-units/", response_model=List[schemas.BusinessUnit])
def read_business_units(db: Session = Depends(get_db)): return db.query(models.BusinessUnit).all()

@app.post("/business-units/", response_model=schemas.BusinessUnit)
def create_business_unit(unit: schemas.BusinessUnitCreate, db: Session = Depends(get_db)):
    db_unit = models.BusinessUnit(name=unit.name, type=unit.type); db.add(db_unit); db.commit(); db.refresh(db_unit); return db_unit

@app.put("/business-units/{unit_id}/", response_model=schemas.BusinessUnit)
def update_business_unit(unit_id: int, unit_update: schemas.BusinessUnitCreate, db: Session = Depends(get_db)):
    db_unit = db.query(models.BusinessUnit).filter(models.BusinessUnit.id == unit_id).first()
    if not db_unit: raise HTTPException(status_code=404, detail="Not found")
    db_unit.name = unit_update.name; db_unit.type = unit_update.type; db.commit(); db.refresh(db_unit); return db_unit

@app.delete("/business-units/{unit_id}/")
def delete_business_unit(unit_id: int, db: Session = Depends(get_db)):
    db_unit = db.query(models.BusinessUnit).filter(models.BusinessUnit.id == unit_id).first()
    if not db_unit: raise HTTPException(status_code=404, detail="Not found")
    db.delete(db_unit); db.commit(); return {"status": "success"}

# Mock Slip Verification API
@app.post("/payment/verify-slip/")
async def verify_slip(type: str, target_id: str, db: Session = Depends(get_db)):
    import random
    ref_no = "".join([str(random.randint(0, 9)) for _ in range(18)])
    current_month_key = datetime.now().strftime("%Y-%m")
    
    if type == "dorm":
        room = db.query(models.DormRoom).filter(models.DormRoom.id == int(target_id)).first()
        if not room: raise HTTPException(status_code=404, detail="Not found")
        if room.payment_status == "paid": return {"status": "already_paid"}
        total = room.rate + room.water_cost + room.electric_cost + room.cleaning_fee + room.other_fee + room.fine_cost
        room.payment_status = "paid"; room.payment_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ref_id = f"dorm_payment_{room.id}_{current_month_key}"
        if not db.query(models.Transaction).filter(models.Transaction.reference_id == ref_id).first():
            db.add(models.Transaction(type=models.TransactionType.INCOME, amount=total, description=f"ค่าเช่าห้อง {room.number} รอบ {current_month_key}", reference_id=ref_id, unit_id=(lambda u: u.id if u else None)(db.query(models.BusinessUnit).filter(models.BusinessUnit.type == models.UnitType.DORMITORY).first())))
        if not db.query(models.DormPayment).filter(models.DormPayment.room_id == room.id, models.DormPayment.month == current_month_key).first():
            db.add(models.DormPayment(room_id=room.id, month=current_month_key, amount=room.rate, water_cost=room.water_cost, electric_cost=room.electric_cost, cleaning_fee=room.cleaning_fee, other_fee=room.other_fee, fine_cost=room.fine_cost, payment_status="paid", paid_at=datetime.utcnow()))
        db.commit(); return {"status": "success", "amount": total, "ref_no": ref_no}
        
    elif type == "house":
        house = db.query(models.RentalHouse).filter(models.RentalHouse.id == target_id).first()
        if not house: raise HTTPException(status_code=404, detail="Not found")
        if house.payment_status == "paid": return {"status": "already_paid"}
        total = house.monthly_rent + house.water_bill + house.electric_bill
        house.payment_status = "paid"; house.last_payment_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ref_id = f"house_payment_{house.id}_{current_month_key}"
        if not db.query(models.Transaction).filter(models.Transaction.reference_id == ref_id).first():
            db.add(models.Transaction(type=models.TransactionType.INCOME, amount=total, description=f"ค่าเช่าบ้าน {house.name} รอบ {current_month_key}", reference_id=ref_id, unit_id=(lambda u: u.id if u else None)(db.query(models.BusinessUnit).filter(models.BusinessUnit.name == house.name).first() or db.query(models.BusinessUnit).filter(models.BusinessUnit.type == models.UnitType.HOUSE).first())))
        if not db.query(models.HousePayment).filter(models.HousePayment.house_id == house.id, models.HousePayment.month == current_month_key).first():
            db.add(models.HousePayment(house_id=house.id, month=current_month_key, amount=house.monthly_rent, water_bill=house.water_bill, electric_bill=house.electric_bill, payment_status="paid", paid_at=datetime.utcnow()))
        db.commit(); return {"status": "success", "amount": total, "ref_no": ref_no}
        
    elif type == "garage":
        job = db.query(models.GarageJob).filter(models.GarageJob.id == int(target_id)).first()
        if not job: raise HTTPException(status_code=404, detail="Not found")
        if job.payment_status == "paid": return {"status": "already_paid"}
        job.payment_status = "paid"; job.status = "picked_up"
        ref_id = f"garage_payment_{job.id}"
        if not db.query(models.Transaction).filter(models.Transaction.reference_id == ref_id).first():
            db.add(models.Transaction(type=models.TransactionType.INCOME, amount=job.total_cost, description=f"ค่าซ่อมรถ {job.license_plate}", reference_id=ref_id, unit_id=(lambda u: u.id if u else None)(db.query(models.BusinessUnit).filter(models.BusinessUnit.type == models.UnitType.GARAGE).first())))
        db.commit(); return {"status": "success", "amount": job.total_cost, "ref_no": ref_no}
        
    elif type == "invoice":
        invoice = db.query(models.Invoice).filter(models.Invoice.id == int(target_id)).first()
        if not invoice: raise HTTPException(status_code=404, detail="Not found")
        if invoice.status == models.InvoiceStatus.PAID: return {"status": "already_paid"}
        invoice.status = models.InvoiceStatus.PAID
        ref_id = f"invoice_payment_{invoice.id}"
        if not db.query(models.Transaction).filter(models.Transaction.reference_id == ref_id).first():
            db.add(models.Transaction(type=models.TransactionType.INCOME, amount=invoice.amount, description=f"ชำระบิล: {invoice.title}", reference_id=ref_id, unit_id=invoice.unit_id, customer_id=invoice.customer_id))
        db.commit(); return {"status": "success", "amount": invoice.amount, "ref_no": ref_no}
    
    raise HTTPException(status_code=400, detail="Invalid type")
