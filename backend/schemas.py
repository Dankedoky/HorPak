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

class InvoiceUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[InvoiceStatus] = None
    due_date: Optional[datetime] = None
    customer_id: Optional[int] = None
    unit_id: Optional[int] = None

    @field_validator('due_date', mode='before')
    @classmethod
    def parse_due_date(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

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

class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    reference_id: Optional[str] = None
    unit_id: Optional[int] = None
    customer_id: Optional[int] = None
    expense_category: Optional[ExpenseCategory] = None

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
    
    # New utility and room status snapshot fields
    water_meter_prev: float = 0.0
    water_meter: float = 0.0
    electricity_meter_prev: float = 0.0
    electricity_meter: float = 0.0
    remark: Optional[str] = None
    move_out: Optional[str] = None
    vacant: Optional[str] = None

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

# Excel Spreadsheet Schemas
class SpreadsheetUpdatePayload(BaseModel):
    rate: Optional[float] = None
    water_meter_prev: Optional[float] = None
    water_meter: Optional[float] = None
    electricity_meter_prev: Optional[float] = None
    electricity_meter: Optional[float] = None
    cleaning_fee: Optional[float] = None
    other_fee: Optional[float] = None
    remark: Optional[str] = None
    move_out: Optional[str] = None
    vacant: Optional[str] = None
    payment_status: Optional[str] = None

class SpreadsheetRoomResponse(BaseModel):
    room_id: int
    number: str
    floor: int
    dorm_key: str
    rate: float
    tenant: str
    water_meter_prev: float
    water_meter: float
    electricity_meter_prev: float
    electricity_meter: float
    water_cost: float
    electric_cost: float
    cleaning_fee: float
    other_fee: float
    fine_cost: float
    payment_status: str
    remark: Optional[str] = None
    move_out: Optional[str] = None
    paid_at: Optional[str] = None


# Budget Schemas
class BudgetBase(BaseModel):
    unit_id: Optional[int] = None
    expense_category: Optional[ExpenseCategory] = None
    amount_limit: float
    period: str = "monthly"  # "monthly" or "yearly"
    year: int
    month: Optional[int] = None

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    id: int
    created_at: datetime
    unit: Optional[BusinessUnitMinimal] = None

    class Config:
        from_attributes = True

class BudgetUsageResponse(BaseModel):
    budget: Budget
    current_usage: float
    percent_usage: float


# Cash Flow Schemas
class CashFlowItem(BaseModel):
    description: str
    amount: float
    date: datetime

class CashFlowActivitySection(BaseModel):
    items: List[CashFlowItem]
    subtotal: float

class CashFlowStatementResponse(BaseModel):
    start_month: str
    end_month: str
    beginning_balance: float
    operating: CashFlowActivitySection
    investing: CashFlowActivitySection
    financing: CashFlowActivitySection
    net_increase: float
    ending_balance: float

# Asset Schemas
class AssetBase(BaseModel):
    name: str
    code: str
    purchase_date: datetime
    purchase_cost: float
    salvage_value: float = 0.0
    useful_life_years: int
    description: Optional[str] = None
    unit_id: Optional[int] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[float] = None
    salvage_value: Optional[float] = None
    useful_life_years: Optional[int] = None
    description: Optional[str] = None
    unit_id: Optional[int] = None
    is_disposed: Optional[bool] = None
    disposal_date: Optional[datetime] = None
    disposal_value: Optional[float] = None

class Asset(AssetBase):
    id: int
    is_disposed: bool
    disposal_date: Optional[datetime] = None
    disposal_value: Optional[float] = None
    created_at: datetime
    unit: Optional[BusinessUnitMinimal] = None
    
    # Calculated on-the-fly fields
    accumulated_depreciation: float = 0.0
    net_book_value: float = 0.0
    depreciated_percent: float = 0.0
    monthly_depreciation: float = 0.0

    class Config:
        from_attributes = True

class AssetSummaryResponse(BaseModel):
    total_cost: float
    total_accumulated_depreciation: float
    total_net_book_value: float

class DepreciationScheduleItem(BaseModel):
    period: str  # e.g., "Year 1", "2026-05"
    depreciation_expense: float
    accumulated_depreciation: float
    net_book_value: float





