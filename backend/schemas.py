from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime
from models import UnitType, InvoiceStatus, TransactionType, ExpenseCategory

class InvoiceBase(BaseModel):
    title: str
    amount: float
    status: InvoiceStatus = InvoiceStatus.UNPAID
    due_date: Optional[datetime] = None

    @field_validator('due_date', mode='before')
    @classmethod
    def parse_due_date(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class InvoiceCreate(InvoiceBase):
    customer_id: int
    unit_id: int

class CustomerMinimal(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    line_user_id: Optional[str] = None

    class Config:
        from_attributes = True

class BusinessUnitMinimal(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True

class Invoice(InvoiceBase):
    id: int
    created_at: datetime
    customer_id: int
    unit_id: int
    customer: Optional[CustomerMinimal] = None
    unit: Optional[BusinessUnitMinimal] = None

    class Config:
        from_attributes = True

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    line_user_id: Optional[str] = None

class CustomerCreate(CustomerBase):
    unit_id: int

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    line_user_id: Optional[str] = None
    unit_id: Optional[int] = None

class Customer(CustomerBase):
    id: int
    unit_id: int
    invoices: List[Invoice] = []

    class Config:
        from_attributes = True

class BusinessUnitBase(BaseModel):
    name: str
    type: UnitType

class BusinessUnitCreate(BusinessUnitBase):
    pass

class BusinessUnit(BusinessUnitBase):
    id: int

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    type: TransactionType
    amount: float
    description: str
    reference_id: Optional[str] = None
    unit_id: Optional[int] = None
    customer_id: Optional[int] = None
    expense_category: Optional[ExpenseCategory] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BusinessUnitSummary(BaseModel):
    id: int
    name: str
    type: UnitType
    total_income: float
    total_expense: float
    balance: float

class DashboardSummary(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    units: List[BusinessUnitSummary]

# DormRoom Schemas
class DormRoomBase(BaseModel):
    dorm_key: str
    number: str
    floor: int
    rate: float
    tenant: Optional[str] = None
    water_meter_prev: float = 0.0
    water_meter: float = 0.0
    electricity_meter_prev: float = 0.0
    electricity_meter: float = 0.0
    water_cost: float = 0.0
    electric_cost: float = 0.0
    cleaning_fee: float = 0.0
    other_fee: float = 0.0
    late_days: int = 0
    fine_cost: float = 0.0
    payment_status: str = "pending"
    payment_date: Optional[str] = None
    remark: Optional[str] = None
    move_out: Optional[str] = None
    vacant: Optional[str] = None
    
    # Lease Agreement Fields
    lease_start_date: Optional[datetime] = None
    lease_end_date: Optional[datetime] = None
    deposit: float = 0.0
    lease_status: str = "active"

    @field_validator('lease_start_date', 'lease_end_date', mode='before')
    @classmethod
    def parse_dates(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class DormRoomCreate(DormRoomBase):
    pass

class DormRoomUpdate(BaseModel):
    tenant: Optional[str] = None
    water_meter_prev: Optional[float] = None
    water_meter: Optional[float] = None
    electricity_meter_prev: Optional[float] = None
    electricity_meter: Optional[float] = None
    water_cost: Optional[float] = None
    electric_cost: Optional[float] = None
    cleaning_fee: Optional[float] = None
    other_fee: Optional[float] = None
    late_days: Optional[int] = None
    fine_cost: Optional[float] = None
    payment_status: Optional[str] = None
    payment_date: Optional[str] = None
    remark: Optional[str] = None
    move_out: Optional[str] = None
    vacant: Optional[str] = None
    
    # Lease Agreement Fields
    lease_start_date: Optional[datetime] = None
    lease_end_date: Optional[datetime] = None
    deposit: Optional[float] = None
    lease_status: Optional[str] = None

    @field_validator('lease_start_date', 'lease_end_date', mode='before')
    @classmethod
    def parse_dates(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class DormRoom(DormRoomBase):
    id: int

    class Config:
        from_attributes = True

# GarageJob Schemas
class GarageJobBase(BaseModel):
    customer_name: str
    license_plate: str
    car_model: str
    description: str
    status: str = "pending"
    total_cost: float = 0.0
    payment_status: str = "unpaid"

class GarageJobCreate(GarageJobBase):
    pass

class GarageJobUpdate(BaseModel):
    customer_name: Optional[str] = None
    license_plate: Optional[str] = None
    car_model: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    total_cost: Optional[float] = None
    payment_status: Optional[str] = None
    finished_at: Optional[datetime] = None

    @field_validator('finished_at', mode='before')
    @classmethod
    def parse_finished_at(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class GarageJob(GarageJobBase):
    id: int
    created_at: datetime
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# RentalHouse Schemas
class RentalHouseBase(BaseModel):
    name: str
    tenant_name: Optional[str] = None
    monthly_rent: float = 0.0
    water_bill: float = 0.0
    electric_bill: float = 0.0
    payment_status: str = "unpaid"
    last_payment_date: Optional[str] = None
    
    # Lease Agreement Fields
    lease_start_date: Optional[datetime] = None
    lease_end_date: Optional[datetime] = None
    deposit: float = 0.0
    lease_status: str = "active"

    @field_validator('lease_start_date', 'lease_end_date', mode='before')
    @classmethod
    def parse_dates(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class RentalHouseCreate(RentalHouseBase):
    id: str

class RentalHouseUpdate(BaseModel):
    tenant_name: Optional[str] = None
    monthly_rent: Optional[float] = None
    water_bill: Optional[float] = None
    electric_bill: Optional[float] = None
    payment_status: Optional[str] = None
    last_payment_date: Optional[str] = None
    
    # Lease Agreement Fields
    lease_start_date: Optional[datetime] = None
    lease_end_date: Optional[datetime] = None
    deposit: Optional[float] = None
    lease_status: Optional[str] = None

    @field_validator('lease_start_date', 'lease_end_date', mode='before')
    @classmethod
    def parse_dates(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class RentalHouse(RentalHouseBase):
    id: str

    class Config:
        from_attributes = True

# HousePayment Schemas
class HousePaymentBase(BaseModel):
    house_id: str
    month: str
    amount: float = 0.0
    water_bill: float = 0.0
    electric_bill: float = 0.0
    payment_status: str = "unpaid"
    paid_at: Optional[datetime] = None
    slip_url: Optional[str] = None

    @field_validator('paid_at', mode='before')
    @classmethod
    def parse_paid_at(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class HousePaymentCreate(HousePaymentBase):
    pass

class HousePayment(HousePaymentBase):
    id: int

    class Config:
        from_attributes = True

# DormPayment Schemas
class DormPaymentBase(BaseModel):
    room_id: int
    month: str
    amount: float = 0.0
    water_cost: float = 0.0
    electric_cost: float = 0.0
    cleaning_fee: float = 0.0
    other_fee: float = 0.0
    fine_cost: float = 0.0
    payment_status: str = "unpaid"
    paid_at: Optional[datetime] = None
    slip_url: Optional[str] = None

    @field_validator('paid_at', mode='before')
    @classmethod
    def parse_paid_at(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class DormPaymentCreate(DormPaymentBase):
    pass

class DormPayment(DormPaymentBase):
    id: int

    class Config:
        from_attributes = True

# MaintenanceTicket Schemas
class MaintenanceTicketBase(BaseModel):
    room_number: str
    description: str
    status: str = "pending"
    line_user_id: Optional[str] = None

class MaintenanceTicketCreate(MaintenanceTicketBase):
    pass

class MaintenanceTicketUpdate(BaseModel):
    status: Optional[str] = None
    resolved_at: Optional[datetime] = None

    @field_validator('resolved_at', mode='before')
    @classmethod
    def parse_resolved_at(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

class MaintenanceTicket(MaintenanceTicketBase):
    id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Utility Analytics Schemas
class UtilityItem(BaseModel):
    month: str              # e.g., "2026-05"
    collected: float        # Collected from tenants
    gov_paid: float         # Paid to government (actual bills)
    margin: float           # collected - gov_paid
    margin_pct: float       # profit margin percentage

class UtilityAnalyticsResponse(BaseModel):
    water: List[UtilityItem]
    electricity: List[UtilityItem]



