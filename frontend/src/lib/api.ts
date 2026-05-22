const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  }

  return response;
}

// ==========================================
// Data Mappers (snake_case <-> camelCase)
// ==========================================

export function mapDormRoomToClient(r: Record<string, unknown>) {
  return {
    id: r.id as number,
    number: r.number as string,
    floor: r.floor as number,
    rate: r.rate as number,
    tenant: (r.tenant as string) || "",
    waterMeterPrev: (r.water_meter_prev as number) || 0,
    waterMeter: (r.water_meter as number) || 0,
    electricityMeterPrev: (r.electricity_meter_prev as number) || 0,
    electricityMeter: (r.electricity_meter as number) || 0,
    waterCost: (r.water_cost as number) || 0,
    electricCost: (r.electric_cost as number) || 0,
    cleaningFee: (r.cleaning_fee as number) || 0,
    otherFee: (r.other_fee as number) || 0,
    lateDays: (r.late_days as number) || 0,
    fineCost: (r.fine_cost as number) || 0,
    paymentStatus: (r.payment_status as string) || "pending",
    paymentDate: (r.payment_date as string) || "",
    remark: (r.remark as string) || "",
    moveOut: (r.move_out as string) || "",
    vacant: (r.vacant as string) || "",
    dormKey: r.dorm_key as string,
    leaseStartDate: (r.lease_start_date as string) || "",
    leaseEndDate: (r.lease_end_date as string) || "",
    deposit: (r.deposit as number) || 0,
    leaseStatus: (r.lease_status as string) || "active",
  };
}

export function mapDormRoomToServer(r: Record<string, unknown>) {
  return {
    dorm_key: r.dormKey || r.dorm_key,
    number: r.number,
    floor: r.floor,
    rate: r.rate,
    tenant: r.tenant,
    water_meter_prev: r.waterMeterPrev,
    water_meter: r.waterMeter,
    electricity_meter_prev: r.electricityMeterPrev,
    electricity_meter: r.electricityMeter,
    water_cost: r.waterCost,
    electric_cost: r.electricCost,
    cleaning_fee: r.cleaningFee,
    other_fee: r.otherFee,
    late_days: r.lateDays,
    fine_cost: r.fineCost,
    payment_status: r.paymentStatus,
    payment_date: r.paymentDate,
    remark: r.remark,
    move_out: r.moveOut,
    vacant: r.vacant,
    lease_start_date: r.leaseStartDate,
    lease_end_date: r.leaseEndDate,
    deposit: r.deposit,
    lease_status: r.leaseStatus,
  };
}

export function mapGarageJobToClient(j: Record<string, unknown>) {
  return {
    id: String(j.id),
    customerName: (j.customer_name as string) || "",
    licensePlate: (j.license_plate as string) || "",
    carModel: (j.car_model as string) || "",
    description: (j.description as string) || "",
    status: (j.status as string) || "pending",
    totalCost: (j.total_cost as number) || 0,
    paymentStatus: (j.payment_status as string) || "unpaid",
    createdAt: j.created_at as string,
    finishedAt: (j.finished_at as string) || undefined,
  };
}

export function mapGarageJobToServer(j: Record<string, unknown>) {
  return {
    customer_name: j.customerName,
    license_plate: j.licensePlate,
    car_model: j.carModel,
    description: j.description,
    status: j.status,
    total_cost: j.totalCost,
    payment_status: j.paymentStatus,
    finished_at: j.finishedAt,
  };
}

export function mapRentalHouseToClient(h: Record<string, unknown>) {
  return {
    id: h.id as string,
    name: h.name as string,
    tenantName: (h.tenant_name as string) || "",
    monthlyRent: (h.monthly_rent as number) || 0,
    waterBill: (h.water_bill as number) || 0,
    electricBill: (h.electric_bill as number) || 0,
    paymentStatus: (h.payment_status as string) || "unpaid",
    lastPaymentDate: (h.last_payment_date as string) || "",
    leaseStartDate: (h.lease_start_date as string) || "",
    leaseEndDate: (h.lease_end_date as string) || "",
    deposit: (h.deposit as number) || 0,
    leaseStatus: (h.lease_status as string) || "active",
  };
}

export function mapRentalHouseToServer(h: Record<string, unknown>) {
  return {
    name: h.name,
    tenant_name: h.tenantName,
    monthly_rent: h.monthlyRent,
    water_bill: h.waterBill,
    electric_bill: h.electricBill,
    payment_status: h.paymentStatus,
    last_payment_date: h.lastPaymentDate,
    lease_start_date: h.leaseStartDate,
    lease_end_date: h.leaseEndDate,
    deposit: h.deposit,
    lease_status: h.leaseStatus,
  };
}

// ==========================================
// API Operations
// ==========================================

export async function fetchUnits() {
  const res = await authFetch(`${API_BASE_URL}/units/`);
  return res.json();
}

export async function fetchCustomers() {
  const res = await authFetch(`${API_BASE_URL}/customers/`);
  return res.json();
}

export async function createCustomer(customer: Record<string, unknown>) {
  const res = await authFetch(`${API_BASE_URL}/customers/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });
  return res.json();
}

export async function updateCustomer(customerId: number | string, customer: Record<string, unknown>) {
  const res = await authFetch(`${API_BASE_URL}/customers/${customerId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });
  return res.json();
}

export async function deleteCustomer(customerId: number | string) {
  const res = await authFetch(`${API_BASE_URL}/customers/${customerId}/`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchInvoices() {
  const res = await authFetch(`${API_BASE_URL}/invoices/`);
  return res.json();
}

export async function createInvoice(invoice: Record<string, unknown>) {
  const res = await authFetch(`${API_BASE_URL}/invoices/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  return res.json();
}

export async function updateInvoiceStatus(invoiceId: number, status: string) {
  const res = await authFetch(`${API_BASE_URL}/invoices/${invoiceId}/status?status=${status}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function updateInvoice(invoiceId: number, invoice: Record<string, unknown>) {
  const res = await authFetch(`${API_BASE_URL}/invoices/${invoiceId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  return res.json();
}

export async function deleteInvoice(invoiceId: number) {
  const res = await authFetch(`${API_BASE_URL}/invoices/${invoiceId}/`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchTransactions() {
  const res = await authFetch(`${API_BASE_URL}/transactions/`);
  return res.json();
}

export async function fetchTransactionSummary() {
  const res = await authFetch(`${API_BASE_URL}/transactions/summary`);
  return res.json();
}

export async function createTransaction(transaction: Record<string, unknown>) {
  const res = await authFetch(`${API_BASE_URL}/transactions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction),
  });
  return res.json();
}

export async function updateTransaction(transactionId: number, transaction: Record<string, unknown>) {
  const res = await authFetch(`${API_BASE_URL}/transactions/${transactionId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction),
  });
  return res.json();
}

export async function deleteTransaction(transactionId: number) {
  const res = await authFetch(`${API_BASE_URL}/transactions/${transactionId}/`, {
    method: 'DELETE',
  });
  return res.json();
}

// Dormitory APIs
export async function fetchDormRooms() {
  const res = await authFetch(`${API_BASE_URL}/rooms/`);
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map(mapDormRoomToClient);
  }
  return [];
}

export async function updateDormRoom(dormKey: string, number: string, room: Record<string, unknown>) {
  const serverPayload = mapDormRoomToServer(room);
  const res = await authFetch(`${API_BASE_URL}/rooms/${dormKey}/${number}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverPayload),
  });
  const data = await res.json();
  return mapDormRoomToClient(data);
}

export async function rolloverDormRooms() {
  const res = await authFetch(`${API_BASE_URL}/rooms/rollover/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function resetDormRooms() {
  const res = await authFetch(`${API_BASE_URL}/rooms/reset/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

// Garage APIs
export async function fetchGarageJobs() {
  const res = await authFetch(`${API_BASE_URL}/garage/jobs/`);
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map(mapGarageJobToClient);
  }
  return [];
}

export async function createGarageJob(job: Record<string, unknown>) {
  const serverPayload = mapGarageJobToServer(job);
  const res = await authFetch(`${API_BASE_URL}/garage/jobs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverPayload),
  });
  const data = await res.json();
  return mapGarageJobToClient(data);
}

export async function updateGarageJob(jobId: number, job: Record<string, unknown>) {
  const serverPayload = mapGarageJobToServer(job);
  const res = await authFetch(`${API_BASE_URL}/garage/jobs/${jobId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverPayload),
  });
  const data = await res.json();
  return mapGarageJobToClient(data);
}

export async function deleteGarageJob(jobId: number) {
  const res = await authFetch(`${API_BASE_URL}/garage/jobs/${jobId}/`, {
    method: 'DELETE',
  });
  return res.json();
}

// House APIs
export async function fetchRentalHouses() {
  const res = await authFetch(`${API_BASE_URL}/houses/`);
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map(mapRentalHouseToClient);
  }
  return [];
}

export async function updateRentalHouse(houseId: string, house: Record<string, unknown>) {
  const serverPayload = mapRentalHouseToServer(house);
  const res = await authFetch(`${API_BASE_URL}/houses/${houseId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverPayload),
  });
  const data = await res.json();
  return mapRentalHouseToClient(data);
}

export async function createRentalHouse(house: Record<string, unknown>) {
  const serverPayload = {
    id: house.id,
    ...mapRentalHouseToServer(house)
  };
  const res = await authFetch(`${API_BASE_URL}/houses/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverPayload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "เกิดข้อผิดพลาดในการสร้างบ้านเช่า");
  }
  const data = await res.json();
  return mapRentalHouseToClient(data);
}

export async function deleteRentalHouse(houseId: string) {
  const res = await authFetch(`${API_BASE_URL}/houses/${houseId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "เกิดข้อผิดพลาดในการลบข้อมูลบ้านเช่า");
  }
  return res.json();
}

export async function fetchHousePayments(houseId: string) {
  const res = await authFetch(`${API_BASE_URL}/houses/${houseId}/payments/`);
  return res.json();
}

export async function fetchRoomPayments(roomId: number) {
  const res = await authFetch(`${API_BASE_URL}/dorm-rooms/${roomId}/payments/`);
  return res.json();
}

export async function verifyPaymentSlip(type: string, targetId: string) {
  const res = await authFetch(`${API_BASE_URL}/payment/verify-slip/?type=${type}&target_id=${targetId}`, {
    method: 'POST'
  });
  return res.json();
}

export async function fetchExpiringLeases() {
  const res = await authFetch(`${API_BASE_URL}/leases/expiring/`);
  return res.json();
}

export async function fetchBusinessUnits() {
  const res = await authFetch(`${API_BASE_URL}/business-units/`);
  return res.json();
}

export async function createBusinessUnit(unit: Record<string, unknown>) {
  const res = await authFetch(`${API_BASE_URL}/business-units/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unit),
  });
  return res.json();
}

export async function updateBusinessUnit(unitId: number, unit: Record<string, unknown>) {
  const res = await authFetch(`${API_BASE_URL}/business-units/${unitId}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unit),
  });
  return res.json();
}

export async function deleteBusinessUnit(unitId: number) {
  const res = await authFetch(`${API_BASE_URL}/business-units/${unitId}/`, {
    method: 'DELETE',
  });
  return res.json();
}

// Maintenance Tickets APIs
export async function fetchMaintenanceTickets() {
  const res = await authFetch(`${API_BASE_URL}/maintenance-tickets/`);
  return res.json();
}

export async function updateMaintenanceTicketStatus(ticketId: number, status: string) {
  const res = await authFetch(`${API_BASE_URL}/maintenance-tickets/${ticketId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function deleteMaintenanceTicket(ticketId: number) {
  const res = await authFetch(`${API_BASE_URL}/maintenance-tickets/${ticketId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "เกิดข้อผิดพลาดในการลบใบแจ้งซ่อม");
  }
  return res.json();
}


