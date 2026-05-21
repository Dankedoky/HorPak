from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

class UnitType(enum.Enum):
    DORMITORY = "dormitory"
    GARAGE = "garage"
    HOUSE = "house"

class BusinessUnit(Base):
    __tablename__ = "business_units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(Enum(UnitType))
    
    customers = relationship("Customer", back_populates="unit")
    invoices = relationship("Invoice", back_populates="unit")
    transactions = relationship("Transaction", back_populates="unit")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, nullable=True)
    line_user_id = Column(String, unique=True, index=True, nullable=True)
    unit_id = Column(Integer, ForeignKey("business_units.id"))
    
    unit = relationship("BusinessUnit", back_populates="customers")
    invoices = relationship("Invoice", back_populates="customer")

class InvoiceStatus(enum.Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    CANCELLED = "cancelled"

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String) # e.g., "Rent May 2026", "Oil Change"
    amount = Column(Float)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.UNPAID)
    created_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    
    customer_id = Column(Integer, ForeignKey("customers.id"))
    unit_id = Column(Integer, ForeignKey("business_units.id"))
    
    customer = relationship("Customer", back_populates="invoices")
    unit = relationship("BusinessUnit", back_populates="invoices")

class TransactionType(enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"

class ExpenseCategory(enum.Enum):
    WATER_BILL = "water_bill"          # ค่าน้ำประปาหลวงส่วนกลาง
    ELECTRIC_BILL = "electric_bill"    # ค่าไฟฟ้าหลวงส่วนกลาง
    SPARE_PARTS = "spare_parts"        # อะไหล่สำหรับอู่รถ
    MAINTENANCE = "maintenance"        # ค่าชำระซ่อมบำรุงห้องพัก/บ้านเช่า
    SALARY = "salary"                  # ค่าแรงช่าง/ค่าจ้างแม่บ้าน
    OTHER = "other"                    # ค่าใช้จ่ายอื่นๆ

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    reference_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    unit_id = Column(Integer, ForeignKey("business_units.id"), nullable=True)
    unit = relationship("BusinessUnit", back_populates="transactions")
    
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer = relationship("Customer")

    expense_category = Column(Enum(ExpenseCategory), nullable=True)


class DormRoom(Base):
    __tablename__ = "dorm_rooms"

    id = Column(Integer, primary_key=True, index=True)
    dorm_key = Column(String, index=True) # e.g. "26_20", "26_577", "73_17"
    number = Column(String, index=True)
    floor = Column(Integer)
    rate = Column(Float)
    tenant = Column(String, nullable=True)
    water_meter_prev = Column(Float, default=0.0)
    water_meter = Column(Float, default=0.0)
    electricity_meter_prev = Column(Float, default=0.0)
    electricity_meter = Column(Float, default=0.0)
    water_cost = Column(Float, default=0.0)
    electric_cost = Column(Float, default=0.0)
    cleaning_fee = Column(Float, default=0.0)
    other_fee = Column(Float, default=0.0)
    late_days = Column(Integer, default=0)
    fine_cost = Column(Float, default=0.0)
    payment_status = Column(String, default="pending") # "pending" or "paid"
    payment_date = Column(String, nullable=True)
    remark = Column(String, nullable=True)
    move_out = Column(String, nullable=True)
    vacant = Column(String, nullable=True)
    
    # Lease Agreement Fields
    lease_start_date = Column(DateTime, nullable=True)
    lease_end_date = Column(DateTime, nullable=True)
    deposit = Column(Float, default=0.0)
    lease_status = Column(String, default="active") # "active", "expired", "terminated"

class GarageJob(Base):
    __tablename__ = "garage_jobs"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    license_plate = Column(String)
    car_model = Column(String)
    description = Column(String)
    status = Column(String, default="pending") # "pending", "in_progress", "finished", "picked_up"
    total_cost = Column(Float, default=0.0)
    payment_status = Column(String, default="unpaid") # "unpaid", "paid"
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

class RentalHouse(Base):
    __tablename__ = "rental_houses"

    id = Column(String, primary_key=True, index=True) # "h1", "h2", "h3"
    name = Column(String)
    tenant_name = Column(String, nullable=True)
    monthly_rent = Column(Float, default=0.0)
    water_bill = Column(Float, default=0.0)
    electric_bill = Column(Float, default=0.0)
    payment_status = Column(String, default="unpaid") # "unpaid", "paid"
    last_payment_date = Column(String, nullable=True)
    
    # Lease Agreement Fields
    lease_start_date = Column(DateTime, nullable=True)
    lease_end_date = Column(DateTime, nullable=True)
    deposit = Column(Float, default=0.0)
    lease_status = Column(String, default="active") # "active", "expired", "terminated"

class HousePayment(Base):
    __tablename__ = "house_payments"

    id = Column(Integer, primary_key=True, index=True)
    house_id = Column(String, ForeignKey("rental_houses.id"), nullable=False)
    month = Column(String, nullable=False) # e.g. "2026-05"
    amount = Column(Float, default=0.0)
    water_bill = Column(Float, default=0.0)
    electric_bill = Column(Float, default=0.0)
    payment_status = Column(String, default="unpaid") # "unpaid", "paid"
    paid_at = Column(DateTime, nullable=True)
    slip_url = Column(String, nullable=True)

class DormPayment(Base):
    __tablename__ = "dorm_payments"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("dorm_rooms.id"), nullable=False)
    month = Column(String, nullable=False) # e.g. "2026-05"
    amount = Column(Float, default=0.0)
    water_cost = Column(Float, default=0.0)
    electric_cost = Column(Float, default=0.0)
    cleaning_fee = Column(Float, default=0.0)
    other_fee = Column(Float, default=0.0)
    fine_cost = Column(Float, default=0.0)
    payment_status = Column(String, default="unpaid") # "unpaid", "paid"
    paid_at = Column(DateTime, nullable=True)
    slip_url = Column(String, nullable=True)

class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="pending") # "pending", "in_progress", "resolved"
    line_user_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

