"use client";

import { useState, useEffect } from "react";
import { fetchDormRooms, updateDormRoom, rolloverDormRooms, resetDormRooms, fetchRoomPayments } from "@/lib/api";
import PromptPayQRCard from "../PromptPayQRCard";

interface Room {
  id?: string | number;
  number: string;
  rate: number;
  floor: number; // or building group: 1 for Floor 1/Building A, 2 for Floor 2/Building B, etc.
  tenant?: string;
  waterMeterPrev?: number;
  waterMeter?: number;
  electricityMeterPrev?: number;
  electricityMeter?: number;
  waterCost?: number;
  electricCost?: number;
  cleaningFee?: number;
  otherFee?: number;
  lateDays?: number;
  fineCost?: number;
  paymentStatus?: "pending" | "paid" | "vacant" | string;
  paymentDate?: string;
  remark?: string;
  moveOut?: string;
  vacant?: string;
  dormKey?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  deposit?: number;
  leaseStatus?: string;
}

type DormType = "26_20" | "26_577" | "73_17";

export default function DormitoryPage() {
  const [activeDorm, setActiveDorm] = useState<DormType>("26_20");

  // Pre-configured room list for หอ 26/20 (Floor 1-5, 26 Rooms)
  const initialRooms26_20: Room[] = [
    // Floor 5
    { number: "501", rate: 2300, floor: 5 },

    // Floor 4
    { number: "401", rate: 2800, floor: 4 },
    { number: "402", rate: 2500, floor: 4 },
    { number: "403", rate: 2500, floor: 4 },
    { number: "404", rate: 2200, floor: 4 },
    { number: "405", rate: 2500, floor: 4 },
    { number: "406", rate: 2500, floor: 4 },
    { number: "407", rate: 2500, floor: 4 },

    // Floor 3
    { number: "301", rate: 2800, floor: 3 },
    { number: "302", rate: 2500, floor: 3 },
    { number: "303", rate: 2500, floor: 3 },
    { number: "304", rate: 3000, floor: 3 },
    { number: "305", rate: 2800, floor: 3 },
    { number: "306", rate: 2800, floor: 3 },
    { number: "307", rate: 3000, floor: 3 },

    // Floor 2
    { number: "201", rate: 3000, floor: 2 },
    { number: "202", rate: 2800, floor: 2 },
    { number: "203", rate: 2800, floor: 2 },
    { number: "204", rate: 3000, floor: 2 },
    { number: "205", rate: 2800, floor: 2 },
    { number: "206", rate: 2500, floor: 2 },
    { number: "207", rate: 2700, floor: 2 },

    // Floor 1
    { number: "101", rate: 2500, floor: 1 },
    { number: "102", rate: 2500, floor: 1 },
    { number: "103", rate: 2500, floor: 1 },
    { number: "104", rate: 2500, floor: 1 },
  ];

  // Pre-configured room list for หอ 26/577 (Floor 1-3, 30 Rooms)
  const initialRooms26_577: Room[] = [
    // Floor 3
    { number: "301", rate: 2500, floor: 3 },
    { number: "302", rate: 2500, floor: 3 },
    { number: "303", rate: 2500, floor: 3 },
    { number: "304", rate: 2500, floor: 3 },
    { number: "305", rate: 2500, floor: 3 },
    { number: "306", rate: 2500, floor: 3 },
    { number: "307", rate: 2500, floor: 3 },
    { number: "308", rate: 2500, floor: 3 },
    { number: "309", rate: 2500, floor: 3 },
    { number: "310", rate: 2500, floor: 3 },

    // Floor 2
    { number: "201", rate: 2500, floor: 2 },
    { number: "202", rate: 2500, floor: 2 },
    { number: "203", rate: 2500, floor: 2 },
    { number: "204", rate: 2500, floor: 2 },
    { number: "205", rate: 2500, floor: 2 },
    { number: "206", rate: 2500, floor: 2 },
    { number: "207", rate: 2500, floor: 2 },
    { number: "208", rate: 2500, floor: 2 },
    { number: "209", rate: 2500, floor: 2 },
    { number: "210", rate: 2500, floor: 2 },

    // Floor 1
    { number: "101", rate: 2500, floor: 1 },
    { number: "102", rate: 2500, floor: 1 },
    { number: "103", rate: 2500, floor: 1 },
    { number: "104", rate: 2000, floor: 1 },
    { number: "105", rate: 2500, floor: 1 },
    { number: "106", rate: 2500, floor: 1 },
    { number: "107", rate: 2500, floor: 1 },
    { number: "108", rate: 2500, floor: 1 },
    { number: "109", rate: 2500, floor: 1 },
    { number: "110", rate: 2500, floor: 1 }
  ];

  // Pre-configured room list for หอ 73/17 (Building A & B, 14 Rooms)
  const initialRooms73_17: Room[] = [
    // Building B
    { number: "B1", rate: 3500, floor: 2 },
    { number: "B2", rate: 3500, floor: 2 },
    { number: "B3", rate: 3500, floor: 2 },
    { number: "B4", rate: 3500, floor: 2 },
    { number: "B5", rate: 3500, floor: 2 },
    { number: "B6", rate: 3500, floor: 2 },
    { number: "B7", rate: 3500, floor: 2 },

    // Building A
    { number: "A1", rate: 3500, floor: 1 },
    { number: "A2", rate: 3500, floor: 1 },
    { number: "A3", rate: 3500, floor: 1 },
    { number: "A4", rate: 3500, floor: 1 },
    { number: "A5", rate: 3500, floor: 1 },
    { number: "A6", rate: 3500, floor: 1 },
    { number: "A7", rate: 3500, floor: 1 }
  ];

  const [rooms26_20, setRooms26_20] = useState<Room[]>(initialRooms26_20);
  const [rooms26_577, setRooms26_577] = useState<Room[]>(initialRooms26_577);
  const [rooms73_17, setRooms73_17] = useState<Room[]>(initialRooms73_17);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRolloverConfirm, setShowRolloverConfirm] = useState(false);
  const [showToast, setShowToast] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [waterRate, setWaterRate] = useState(17);
  const [electricRate, setElectricRate] = useState(7);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFloor, setFilterFloor] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "occupied" | "vacant">("all");

  // Invoice creation form states
  const [prevWater, setPrevWater] = useState("");
  const [currWater, setCurrWater] = useState("");
  const [prevElectric, setPrevElectric] = useState("");
  const [currElectric, setCurrElectric] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [otherFee, setOtherFee] = useState("");
  const [lateDays, setLateDays] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [paymentDate, setPaymentDate] = useState("");
  const [remark, setRemark] = useState("");
  const [moveOut, setMoveOut] = useState("");
  const [vacant, setVacant] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [roomRate, setRoomRate] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const [generatedAmount, setGeneratedAmount] = useState(0);

  // New Lease & Tab States
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [deposit, setDeposit] = useState("");
  const [leaseStatus, setLeaseStatus] = useState("active");
  const [activeTab, setActiveTab] = useState<"meters" | "lease" | "history">("meters");
  const [paymentHistory, setPaymentHistory] = useState<Record<string, unknown>[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [payRoom, setPayRoom] = useState<Room | null>(null);

  // Load from Backend API on mount
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setTimeout(() => setIsMounted(true), 0);
        const allRooms = await fetchDormRooms();
        if (allRooms && allRooms.length > 0) {
          if (active) {
            setRooms26_20(allRooms.filter(r => r.dormKey === "26_20"));
            setRooms26_577(allRooms.filter(r => r.dormKey === "26_577"));
            setRooms73_17(allRooms.filter(r => r.dormKey === "73_17"));
          }
        }
      } catch (err) {
        console.error("Failed to load dorm rooms on mount:", err);
      }
      
      // Load rates from localStorage (as configured by settings)
      const savedWater = localStorage.getItem("setting_water_rate");
      const savedElectric = localStorage.getItem("setting_electric_rate");
      if (savedWater) setWaterRate(parseFloat(savedWater));
      if (savedElectric) setElectricRate(parseFloat(savedElectric));
    };

    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "setting_water_rate" && e.newValue) setWaterRate(parseFloat(e.newValue));
      if (e.key === "setting_electric_rate" && e.newValue) setElectricRate(parseFloat(e.newValue));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      active = false;
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Fetch payment history when activeTab is history
  useEffect(() => {
    if (selectedRoom && selectedRoom.id && activeTab === "history") {
      setTimeout(() => setLoadingHistory(true), 0);
      fetchRoomPayments(Number(selectedRoom.id))
        .then(data => {
          setPaymentHistory(data || []);
          setLoadingHistory(false);
        })
        .catch(err => {
          console.error("Error fetching room payments:", err);
          setLoadingHistory(false);
        });
    }
  }, [selectedRoom, activeTab]);

  const triggerToast = (message: string) => {
    setShowToast(message);
    setTimeout(() => {
      setShowToast("");
    }, 4000);
  };

  const handleTogglePaymentStatus = async (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    const nextStatus = (room.paymentStatus === "paid" ? "pending" : "paid") as "pending" | "paid";
    
    // Optimistic update locally
    const targetSetter = 
      activeDorm === "26_20" ? setRooms26_20 : 
      activeDorm === "26_577" ? setRooms26_577 : setRooms73_17;
      
    targetSetter(prev => prev.map(r => {
      if (r.number === room.number && r.floor === room.floor) {
        return { ...r, paymentStatus: nextStatus };
      }
      return r;
    }));

    try {
      // Call API to persist
      const updatedRoom = { ...room, paymentStatus: nextStatus };
      await updateDormRoom(activeDorm, room.number, updatedRoom);
    } catch (err) {
      console.error("Failed to toggle payment status:", err);
      // Revert local state on failure
      targetSetter(prev => prev.map(r => {
        if (r.number === room.number && r.floor === room.floor) {
          return { ...r, paymentStatus: room.paymentStatus };
        }
        return r;
      }));
      triggerToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล ❌");
      return;
    }

    const nextLabel = nextStatus === "paid" ? "ชำระเงินแล้ว 🟢" : "ค้างชำระ 🔴";
    triggerToast(`ห้อง ${room.number} เปลี่ยนสถานะเป็น ${nextLabel}`);
  };

  const handleExportDormPDF = () => {
    const currentRooms = 
      activeDorm === "26_20" ? rooms26_20 : 
      activeDorm === "26_577" ? rooms26_577 : rooms73_17;

    const dormName = 
      activeDorm === "26_20" ? "หอพัก 26/20" : 
      activeDorm === "26_577" ? "หอพัก 26/577" : "หอพัก 73/17";

    const currentWaterRate = waterRate;
    const currentElectricRate = electricRate;

    const activeRooms = currentRooms.filter(r => !!(r.tenant && r.tenant.trim() !== ""));
    const occupiedCount = activeRooms.length;
    const vacantCount = currentRooms.length - occupiedCount;

    const totalRent = activeRooms.reduce((sum, r) => sum + r.rate, 0);
    const totalWater = activeRooms.reduce((sum, r) => sum + (r.waterCost || 0), 0);
    const totalElectric = activeRooms.reduce((sum, r) => sum + (r.electricCost || 0), 0);
    const totalCleaning = activeRooms.reduce((sum, r) => sum + (r.cleaningFee || 0), 0);
    const totalOther = activeRooms.reduce((sum, r) => sum + (r.otherFee || 0), 0);
    const totalFines = activeRooms.reduce((sum, r) => sum + (r.fineCost || 0), 0);

    const grandTotal = totalRent + totalWater + totalElectric + totalCleaning + totalOther + totalFines;

    const totalPaid = activeRooms.reduce((sum, r) => {
      const roomTotal = r.rate + (r.waterCost || 0) + (r.electricCost || 0) + (r.cleaningFee || 0) + (r.otherFee || 0) + (r.fineCost || 0);
      return sum + (r.paymentStatus === "paid" ? roomTotal : 0);
    }, 0);

    const totalPending = grandTotal - totalPaid;

    const todayStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("❌ ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาตการใช้งาน Pop-up ในเบราว์เซอร์ของคุณ!");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>รายงานสรุปประจำเดือน - ${dormName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 10mm;
              }
              body {
                padding: 0 !important;
                background-color: #ffffff !important;
              }
            }
            body {
              font-family: 'Prompt', sans-serif;
              color: #1e293b;
              background-color: #ffffff;
              padding: 30px;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-container {
              width: 100%;
              max-width: 1100px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 3px solid #1d4ed8;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .title-area h1 {
              font-size: 20px;
              font-weight: 800;
              color: #1e3a8a;
              margin: 0 0 4px 0;
            }
            .title-area p {
              font-size: 11px;
              color: #64748b;
              margin: 0;
              font-weight: bold;
            }
            .date-badge {
              font-size: 11px;
              font-weight: 700;
              background-color: #eff6ff;
              color: #1d4ed8;
              padding: 6px 12px;
              border-radius: 8px;
              border: 1px solid #bfdbfe;
            }
            .stats-grid {
              display: grid;
              grid-template-cols: repeat(6, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .stat-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px;
              text-align: center;
            }
            .stat-card.blue {
              background-color: #eff6ff;
              border-color: #bfdbfe;
            }
            .stat-card.emerald {
              background-color: #ecfdf5;
              border-color: #a7f3d0;
            }
            .stat-card.rose {
              background-color: #fff1f2;
              border-color: #fecdd3;
            }
            .stat-label {
              font-size: 9px;
              color: #64748b;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .stat-card.blue .stat-label { color: #1d4ed8; }
            .stat-card.emerald .stat-label { color: #047857; }
            .stat-card.rose .stat-label { color: #be123c; }

            .stat-value {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
            }
            .stat-card.blue .stat-value { color: #1e40af; }
            .stat-card.emerald .stat-value { color: #065f46; }
            .stat-card.rose .stat-value { color: #9f1239; }

            .table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              font-size: 11px;
            }
            .table th {
              background-color: #f1f5f9;
              border: 1px solid #cbd5e1;
              color: #334155;
              font-weight: 700;
              padding: 8px 4px;
              text-align: center;
            }
            .table td {
              border: 1px solid #cbd5e1;
              padding: 6px 4px;
              text-align: center;
              font-weight: 500;
            }
            .table tr.vacant-row {
              background-color: #fafafa;
              color: #94a3b8;
            }
            .table tr.vacant-row td {
              color: #94a3b8;
            }
            .badge {
              font-size: 9px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
              display: inline-block;
            }
            .badge.paid {
              background-color: #d1fae5;
              color: #065f46;
              border: 1px solid #a7f3d0;
            }
            .badge.pending {
              background-color: #fee2e2;
              color: #991b1b;
              border: 1px solid #fecdd3;
            }
            .badge.vacant {
              background-color: #f1f5f9;
              color: #475569;
              border: 1px solid #cbd5e1;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
              font-size: 11px;
            }
            .signature-box {
              width: 220px;
              text-align: center;
            }
            .signature-line {
              border-bottom: 1px solid #94a3b8;
              height: 40px;
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div class="title-area">
                <h1>รายงานสรุปรายรับและสถานะห้องพักประจำเดือน</h1>
                <p>หอพักเครือข่ายอัจฉริยะ &bull; ${dormName}</p>
              </div>
              <div class="date-badge">วันที่ออกรายงาน: ${todayStr}</div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">เช่าแล้ว / ว่าง</div>
                <div class="stat-value">${occupiedCount} / ${vacantCount} ห้อง</div>
              </div>
              <div class="stat-card blue">
                <div class="stat-label">ยอดเรียกเก็บสุทธิ</div>
                <div class="stat-value">${grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
              </div>
              <div class="stat-card emerald">
                <div class="stat-label">ชำระเงินแล้ว</div>
                <div class="stat-value">${totalPaid.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
              </div>
              <div class="stat-card rose">
                <div class="stat-label">ยอดค้างชำระ</div>
                <div class="stat-value">${totalPending.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">รายรับค่าน้ำ (${currentWaterRate} ฿/หน่วย)</div>
                <div class="stat-value">${totalWater.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">รายรับค่าไฟ (${currentElectricRate} ฿/หน่วย)</div>
                <div class="stat-value">${totalElectric.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th style="width: 8%">ห้อง</th>
                  <th style="width: 14%">ชื่อผู้เช่า</th>
                  <th style="width: 10%">ค่าเช่าห้อง</th>
                  <th style="width: 12%">มิเตอร์น้ำ (เดิม-ใหม่)</th>
                  <th style="width: 9%">ค่าน้ำ</th>
                  <th style="width: 12%">มิเตอร์ไฟ (เดิม-ใหม่)</th>
                  <th style="width: 9%">ค่าไฟ</th>
                  <th style="width: 8%">บริการอื่น ๆ</th>
                  <th style="width: 8%">ค่าปรับเลท</th>
                  <th style="width: 10%">ยอดรวมสุทธิ</th>
                  <th style="width: 10%">สถานะชำระ</th>
                </tr>
              </thead>
              <tbody>
                ${currentRooms.map(room => {
                  const isOccupied = !!(room.tenant && room.tenant.trim() !== "");
                  
                  if (!isOccupied) {
                    return `
                      <tr class="vacant-row">
                        <td style="font-weight: 700;">${room.number}</td>
                        <td style="font-style: italic;">(ห้องว่าง)</td>
                        <td>${room.rate.toLocaleString()} ฿</td>
                        <td>-</td>
                        <td>0.00 ฿</td>
                        <td>-</td>
                        <td>0.00 ฿</td>
                        <td>-</td>
                        <td>-</td>
                        <td>0.00 ฿</td>
                        <td><span class="badge vacant">ว่าง</span></td>
                      </tr>
                    `;
                  }

                  const wPrev = room.waterMeterPrev || 0;
                  const wCurr = room.waterMeter || wPrev;
                  const wCost = room.waterCost || 0;

                  const ePrev = room.electricityMeterPrev || 0;
                  const eCurr = room.electricityMeter || ePrev;
                  const eCost = room.electricCost || 0;

                  const cFee = room.cleaningFee || 0;
                  const oFee = room.otherFee || 0;
                  const extra = cFee + oFee;

                  const fine = room.fineCost || 0;
                  const roomTotal = room.rate + wCost + eCost + extra + fine;

                  return `
                    <tr>
                      <td style="font-weight: 800; color: #1e3a8a;">${room.number}</td>
                      <td style="font-weight: 700; text-align: left; padding-left: 8px;">👤 ${room.tenant}</td>
                      <td style="font-weight: 700;">${room.rate.toLocaleString()} ฿</td>
                      <td>${wPrev} ➡️ ${wCurr}</td>
                      <td style="font-weight: 700; color: #0284c7;">${wCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</td>
                      <td>${ePrev} ➡️ ${eCurr}</td>
                      <td style="font-weight: 700; color: #ea580c;">${eCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</td>
                      <td>${extra > 0 ? extra.toLocaleString() + ' ฿' : '-'}</td>
                      <td style="${fine > 0 ? 'color: #dc2626; font-weight: 800;' : ''}">${fine > 0 ? fine.toLocaleString() + ' ฿' : '-'}</td>
                      <td style="font-weight: 800; color: #1d4ed8; background-color: #f8fafc;">${roomTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</td>
                      <td>
                        <span class="badge ${room.paymentStatus === 'paid' ? 'paid' : 'pending'}">
                          ${room.paymentStatus === 'paid' ? 'จ่ายแล้ว' : 'ค้างชำระ'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="signature-section">
              <div class="signature-box">
                <p>ผู้รายงาน / ผู้ตรวจสอบ</p>
                <div class="signature-line"></div>
                <p>(........................................................)</p>
              </div>
              <div class="signature-box">
                <p>เจ้าหน้าที่ผู้รับเงินชำระ</p>
                <div class="signature-line"></div>
                <p>(........................................................)</p>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    triggerToast("🖨️ กำลังออกรายงานสรุป PDF ทั้งหอพัก...");
  };

  const handleBackupData = () => {
    const data = {
      rooms26_20,
      rooms26_577,
      rooms73_17
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    const today = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("download", `dormitory_backup_${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("สำรองข้อมูลหอพักเรียบร้อยแล้ว! 💾");
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.rooms26_20 && parsed.rooms26_577 && parsed.rooms73_17) {
          setRooms26_20(parsed.rooms26_20);
          setRooms26_577(parsed.rooms26_577);
          setRooms73_17(parsed.rooms73_17);
          
          localStorage.setItem("dorm_rooms_26_20", JSON.stringify(parsed.rooms26_20));
          localStorage.setItem("dorm_rooms_26_577", JSON.stringify(parsed.rooms26_577));
          localStorage.setItem("dorm_rooms_73_17", JSON.stringify(parsed.rooms73_17));
          
          triggerToast("นำเข้าข้อมูลสำรองสำเร็จแล้ว! 📥");
        } else {
          alert("❌ ไฟล์สำรองข้อมูลไม่ถูกต้อง!");
        }
      } catch {
        alert("❌ ไม่สามารถอ่านไฟล์ข้อมูลสำรองนี้ได้!");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Active rooms list mapping
  const currentRooms = 
    activeDorm === "26_20" ? rooms26_20 : 
    activeDorm === "26_577" ? rooms26_577 : rooms73_17;

  const setRooms = 
    activeDorm === "26_20" ? setRooms26_20 : 
    activeDorm === "26_577" ? setRooms26_577 : setRooms73_17;

  // Statistics calculations
  const totalRoomsCount = currentRooms.length;
  const occupiedCount = currentRooms.filter(r => r.tenant && r.tenant.trim() !== "").length;
  const vacantCount = totalRoomsCount - occupiedCount;
  
  const expectedRentRevenue = currentRooms.reduce((sum, r) => sum + (r.tenant && r.tenant.trim() !== "" ? r.rate : 0), 0);
  const totalWaterRevenue = currentRooms.reduce((sum, r) => sum + (r.waterCost || 0), 0);
  const totalElectricRevenue = currentRooms.reduce((sum, r) => sum + (r.electricCost || 0), 0);
  const totalOtherRevenue = currentRooms.reduce((sum, r) => sum + (r.cleaningFee || 0) + (r.otherFee || 0) + (r.fineCost || 0), 0);
  const totalExpectedRevenue = expectedRentRevenue + totalWaterRevenue + totalElectricRevenue + totalOtherRevenue;

  const totalPaidRevenue = currentRooms.reduce((sum, r) => {
    if (r.tenant && r.tenant.trim() !== "" && r.paymentStatus === "paid") {
      const roomTotal = r.rate + (r.waterCost || 0) + (r.electricCost || 0) + (r.cleaningFee || 0) + (r.otherFee || 0) + (r.fineCost || 0);
      return sum + roomTotal;
    }
    return sum;
  }, 0);

  const totalPendingRevenue = totalExpectedRevenue - totalPaidRevenue;

  if (!isMounted) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-bold">กำลังโหลดข้อมูล...</div>;

  // Open invoice dialog for a room
  const handleOpenRoomModal = (room: Room) => {
    setSelectedRoom(room);
    setTenantName(room.tenant || "");
    setRoomRate(room.rate ? room.rate.toString() : "");
    setPrevWater((room.waterMeterPrev || 0).toString());
    // ถ้าค่าใหม่เท่ากับค่าเก่า หรือไม่มีค่าใหม่ (ยังไม่ได้กรอกในรอบบิลนี้) ให้เป็นค่าว่างไว้กรอกใหม่
    const showWaterCurr = room.waterMeter && room.waterMeter !== room.waterMeterPrev 
      ? room.waterMeter.toString() 
      : "";
    setCurrWater(showWaterCurr);

    setPrevElectric((room.electricityMeterPrev || 0).toString());
    const showElectricCurr = room.electricityMeter && room.electricityMeter !== room.electricityMeterPrev 
      ? room.electricityMeter.toString() 
      : "";
    setCurrElectric(showElectricCurr); 
    setCleaningFee((room.cleaningFee || "").toString());
    setOtherFee((room.otherFee || "").toString());
    setLateDays((room.lateDays || "").toString());
    setPaymentStatus(room.paymentStatus === "paid" ? "paid" : "pending");
    setPaymentDate(room.paymentDate || "");
    setRemark(room.remark || "");
    setMoveOut(room.moveOut || "");
    setVacant(room.vacant || "");
    
    // Set new Lease states
    setLeaseStartDate(room.leaseStartDate || "");
    setLeaseEndDate(room.leaseEndDate || "");
    setDeposit(room.deposit ? room.deposit.toString() : "");
    setLeaseStatus(room.leaseStatus || "active");
    setActiveTab("meters"); // Reset to main tab
    setPaymentHistory([]);

    setInvoiceSuccess(false);
    setGeneratedAmount(0);
  };

  const handleGenerateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    // Calculate utility totals (Excel-like robust math)
    const wPrev = parseFloat(prevWater) || 0;
    const wCurr = parseFloat(currWater) || wPrev;
    const waterUnitsUsed = Math.max(wCurr - wPrev, 0);
    const waterCost = waterUnitsUsed * waterRate;

    const ePrev = parseFloat(prevElectric) || 0;
    const eCurr = parseFloat(currElectric) || ePrev;
    const electricUnitsUsed = Math.max(eCurr - ePrev, 0);
    const electricCost = electricUnitsUsed * electricRate;

    const cFee = parseFloat(cleaningFee) || 0;
    const oFee = parseFloat(otherFee) || 0;
    const lDays = parseInt(lateDays) || 0;
    const fineCost = lDays * 100;

    const parsedRoomRate = parseFloat(roomRate) || 0;
    const totalAmount = parsedRoomRate + waterCost + electricCost + cFee + oFee + fineCost;

    // Update room meters with new values
    // waterMeterPrev = ค่ามิเตอร์เก่า (จาก input ค่าเก่า)
    // waterMeter = ค่ามิเตอร์ใหม่ (จาก input ค่าใหม่) — ไม่ทับค่าเก่า
    const updatedRoomFields = {
      tenant: tenantName,
      rate: parsedRoomRate,
      waterMeterPrev: wPrev,
      waterMeter: wCurr,
      electricityMeterPrev: ePrev,
      electricityMeter: eCurr,
      waterCost: waterCost,
      electricCost: electricCost,
      cleaningFee: cFee,
      otherFee: oFee,
      lateDays: lDays,
      fineCost: fineCost,
      paymentStatus: paymentStatus,
      paymentDate: paymentDate,
      remark: remark,
      moveOut: moveOut,
      vacant: vacant,
      leaseStartDate: leaseStartDate || "",
      leaseEndDate: leaseEndDate || "",
      deposit: parseFloat(deposit) || 0,
      leaseStatus: leaseStatus || "active"
    };

    // Update state locally
    setRooms(prev => prev.map(r => {
      if (r.number === selectedRoom.number && r.floor === selectedRoom.floor) {
        return { ...r, ...updatedRoomFields };
      }
      return r;
    }));

    // Async DB update call
    updateDormRoom(activeDorm, selectedRoom.number, { ...selectedRoom, ...updatedRoomFields })
      .catch(err => {
        console.error("Failed to update room invoice in DB:", err);
        triggerToast("เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยังเซิร์ฟเวอร์ ❌");
      });

    setGeneratedAmount(totalAmount);
    setInvoiceSuccess(true);
    setTimeout(() => {
      setInvoiceSuccess(false);
      setSelectedRoom(null);
    }, 2500);
  };

  // Filter logic
  const filteredRooms = currentRooms.filter(room => {
    const matchesSearch = room.number.replace(/\s+/g, "").toLowerCase().includes(searchQuery.replace(/\s+/g, "").toLowerCase());
    const matchesFloor = filterFloor === "all" || room.floor === filterFloor;
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "occupied" && room.rate > 0) ||
      (filterStatus === "vacant" && room.rate === 0);
    
    return matchesSearch && matchesFloor && matchesStatus;
  }).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md mb-2 inline-block">Dormitory Module</span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">ระบบบริการจัดการหอพัก</h1>
          <p className="text-slate-500 text-xs mt-0.5">จัดการข้อมูลผู้เช่า ค่าน้ำ ค่าไฟ และออกใบเรียกเก็บเงินตามรอบบิลของแต่ละหอพัก</p>
        </div>
        
        {/* System Actions Group */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Data Tools */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={handleBackupData}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1.5 shadow-sm border border-slate-100 hover:border-slate-300"
            >
              <span>💾</span>
              <span>สำรองข้อมูล</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("restore-file-input")?.click()}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1.5 shadow-sm border border-slate-100 hover:border-slate-300"
            >
              <span>📥</span>
              <span>นำเข้าข้อมูล</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setShowRolloverConfirm(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1.5 shadow-sm border border-slate-100 hover:border-blue-200"
            >
              <span>🔄</span>
              <span>ขึ้นรอบบิลใหม่</span>
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1.5 shadow-sm border border-slate-100 hover:border-rose-200"
            >
              <span>🧹</span>
              <span>ล้างข้อมูล</span>
            </button>
          </div>

          {/* Primary Action */}
          <button
            type="button"
            onClick={handleExportDormPDF}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm sm:text-xs font-black transition-all flex justify-center items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <span>🖨️</span>
            <span>ออกรายงาน PDF ทั้งหอ</span>
          </button>
          
          <input
            type="file"
            id="restore-file-input"
            accept=".json"
            onChange={handleRestoreData}
            className="hidden"
          />
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Rooms Info */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-center items-center">
          <div className="text-slate-400 font-bold text-xs mb-1.5 uppercase tracking-wide">เช่าแล้ว / ว่าง</div>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{occupiedCount} <span className="text-sm font-semibold text-slate-400">/ {vacantCount}</span></div>
        </div>

        {/* Total Expected Monthly Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-center items-center">
          <div className="text-blue-600 font-bold text-xs mb-1.5 uppercase tracking-wide">ยอดเรียกเก็บทั้งหมด</div>
          <div className="text-3xl font-extrabold text-blue-600 tracking-tight">{totalExpectedRevenue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})} <span className="text-sm font-semibold text-slate-400">฿</span></div>
        </div>

        {/* Paid Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-center items-center">
          <div className="text-emerald-500 font-bold text-xs mb-1.5 uppercase tracking-wide">ชำระเงินแล้ว</div>
          <div className="text-3xl font-extrabold text-emerald-500 tracking-tight">{totalPaidRevenue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})} <span className="text-sm font-semibold text-slate-400">฿</span></div>
        </div>

        {/* Pending Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-center items-center">
          <div className="text-rose-500 font-bold text-xs mb-1.5 uppercase tracking-wide">ยอดค้างชำระ</div>
          <div className="text-3xl font-extrabold text-rose-500 tracking-tight">{totalPendingRevenue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})} <span className="text-sm font-semibold text-slate-400">฿</span></div>
        </div>

        {/* Water Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-center items-center">
          <div className="text-cyan-500 font-bold text-xs mb-1.5 uppercase tracking-wide">รวมค่าน้ำ</div>
          <div className="text-3xl font-extrabold text-cyan-500 tracking-tight">{totalWaterRevenue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})} <span className="text-sm font-semibold text-slate-400">฿</span></div>
        </div>

        {/* Electric Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-center items-center">
          <div className="text-orange-500 font-bold text-xs mb-1.5 uppercase tracking-wide">รวมค่าไฟ</div>
          <div className="text-3xl font-extrabold text-orange-500 tracking-tight">{totalElectricRevenue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})} <span className="text-sm font-semibold text-slate-400">฿</span></div>
        </div>

      </div>

      {/* Dorm Selector & Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col gap-5">
        
        {/* Dorm Tabs */}
        <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 overflow-x-auto w-full">
          <button
            onClick={() => {
              setActiveDorm("26_20");
              setFilterFloor("all");
            }}
            className={`flex-1 min-w-[120px] px-4 py-2.5 text-sm font-black rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeDorm === "26_20"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
            }`}
          >
            <span>🏢 หอ 26/20</span>
            <span className="text-[10px] font-normal opacity-70 bg-slate-100 px-1.5 py-0.5 rounded-md">(26 ห้อง)</span>
          </button>
          <button
            onClick={() => {
              setActiveDorm("26_577");
              setFilterFloor("all");
            }}
            className={`flex-1 min-w-[120px] px-4 py-2.5 text-sm font-black rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeDorm === "26_577"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
            }`}
          >
            <span>🏢 หอ 26/577</span>
            <span className="text-[10px] font-normal opacity-70 bg-slate-100 px-1.5 py-0.5 rounded-md">(30 ห้อง)</span>
          </button>
          <button
            onClick={() => {
              setActiveDorm("73_17");
              setFilterFloor("all");
            }}
            className={`flex-1 min-w-[120px] px-4 py-2.5 text-sm font-black rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeDorm === "73_17"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
            }`}
          >
            <span>🏢 หอ 73/17</span>
            <span className="text-[10px] font-normal opacity-70 bg-slate-100 px-1.5 py-0.5 rounded-md">(14 ห้อง)</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="ค้นหาเลขห้อง... (เช่น 104, B3)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition duration-200 outline-none"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Select floor/building and occupancy status */}
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            {/* Group filter (Floor or Building) */}
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value === "all" ? "all" : parseInt(e.target.value))}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs focus:border-blue-500 transition outline-none"
            >
              <option value="all">
                {activeDorm === "73_17" ? "ตึกทั้งหมด (All Buildings)" : "ทุกชั้น (All Floors)"}
              </option>
              {activeDorm === "26_20" && <option value="5">ชั้น 5 (Floor 5)</option>}
              {activeDorm === "26_20" && <option value="4">ชั้น 4 (Floor 4)</option>}
              
              {activeDorm === "73_17" ? (
                <>
                  <option value="2">ตึก B (Building B)</option>
                  <option value="1">ตึก A (Building A)</option>
                </>
              ) : (
                <>
                  <option value="3">ชั้น 3 (Floor 3)</option>
                  <option value="2">ชั้น 2 (Floor 2)</option>
                  <option value="1">ชั้น 1 (Floor 1)</option>
                </>
              )}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "occupied" | "vacant")}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs focus:border-blue-500 transition outline-none"
            >
              <option value="all">สถานะทั้งหมด (All Status)</option>
              <option value="occupied">ห้องที่มีผู้เช่า (Occupied)</option>
              <option value="vacant">ห้องว่าง (Vacant)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rooms Floor Grid Grouping */}
      <div className="space-y-6">
        {(
          activeDorm === "26_20" ? [5, 4, 3, 2, 1] : 
          activeDorm === "26_577" ? [3, 2, 1] : [2, 1]
        ).map((groupNum) => {
          // If we filtered specific floor/building and this is not the one, skip
          if (filterFloor !== "all" && filterFloor !== groupNum) return null;
          
          const groupRooms = filteredRooms.filter(r => r.floor === groupNum);
          if (groupRooms.length === 0) return null;

          // Determine heading name (Floor 1-5 or Building A/B)
          const groupLabel = 
            activeDorm === "73_17" 
              ? (groupNum === 1 ? "ตึก A (Building A)" : "ตึก B (Building B)")
              : `ชั้นที่ ${groupNum} (Floor ${groupNum})`;

          return (
            <div key={groupNum} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)] space-y-4">
              {/* Group Label */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block" />
                  {groupLabel}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {groupRooms.length} ห้องแสดงผล
                </span>
              </div>

              {/* Grid of rooms on this floor / building wing */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
                {groupRooms.map((room, idx) => {
                  const isOccupied = !!(room.tenant && room.tenant.trim() !== "");
                  const roomKey = room.id || `${activeDorm}_${room.floor}_${room.number}_${idx}`;
                  
                  return (
                    // Use div instead of button to avoid nested <button> HTML violation
                    <div
                      key={roomKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenRoomModal(room)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleOpenRoomModal(room); }}
                      className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 w-full relative overflow-hidden group hover:shadow-md cursor-pointer hover:scale-[1.01] ${
                        isOccupied
                          ? "bg-slate-50 border-slate-200/80 hover:border-blue-400"
                          : "bg-white border-dashed border-slate-200 hover:border-emerald-400"
                      }`}
                    >
                      {/* Room number header */}
                      <span className="font-black text-sm text-slate-800 block mb-1 group-hover:text-blue-600 transition-colors">
                        ห้อง {room.number}
                      </span>

                      {/* Rate or Vacant state */}
                      {isOccupied ? (
                        <>
                          <span className="text-[11px] font-bold text-slate-600 tracking-tight">
                            ค่าห้อง: {room.rate.toLocaleString()} ฿
                          </span>
                          {room.tenant && (
                            <span className="text-[10px] font-medium text-slate-500 truncate max-w-full mt-1.5 flex items-center gap-1">
                              <span>👤</span> <span className="truncate">{room.tenant}</span>
                            </span>
                          )}
                          {room.paymentStatus === "paid" ? (
                            <button
                              type="button"
                              onClick={(e) => handleTogglePaymentStatus(e, room)}
                              className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 px-2 py-0.5 rounded-lg mt-2.5 flex items-center gap-1 transition cursor-pointer w-max uppercase"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>ชำระแล้ว</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleTogglePaymentStatus(e, room)}
                              className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 px-2 py-0.5 rounded-lg mt-2.5 flex items-center gap-1 transition cursor-pointer w-max uppercase"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span>ค้างชำระ</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-bold text-slate-400">
                            ค่าเช่าห้อง: {room.rate.toLocaleString()} ฿
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded mt-2 block w-max uppercase">
                            ว่าง
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice Generator Popup/Modal */}
      {selectedRoom && (() => {
        // Live Excel-like Calculation safely handling NaNs
        const wPrev = parseFloat(prevWater) || 0;
        const wCurr = parseFloat(currWater) || wPrev;
        const waterUnitsUsed = Math.max(wCurr - wPrev, 0);
        const waterCost = waterUnitsUsed * waterRate;

        const ePrev = parseFloat(prevElectric) || 0;
        const eCurr = parseFloat(currElectric) || ePrev;
        const electricUnitsUsed = Math.max(eCurr - ePrev, 0);
        const electricCost = electricUnitsUsed * electricRate;

        const cFee = parseFloat(cleaningFee) || 0;
        const oFee = parseFloat(otherFee) || 0;
        const lDays = parseInt(lateDays) || 0;
        const fineCost = lDays * 100;

        const parsedLiveRate = parseFloat(roomRate) || 0;
        const liveTotalAmount = parsedLiveRate + waterCost + electricCost + cFee + oFee + fineCost;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-6 animate-[fadeIn_0.2s_ease-out] overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-4xl w-full border border-slate-100 shadow-2xl relative my-auto max-h-[95vh] lg:max-h-[90vh] overflow-y-auto lg:overflow-visible">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedRoom(null)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer transition z-10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal Header */}
              <div className="mb-5">
                <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                  <span>⚙️ จัดการห้องพัก & ออกบิล</span>
                  <span className="bg-blue-50 text-blue-600 px-3 py-0.5 rounded-full text-xs md:text-sm font-extrabold border border-blue-100">ห้อง {selectedRoom.number}</span>
                </h3>
                <p className="text-slate-400 text-[11px] md:text-xs">แก้ไขรายละเอียดผู้เช่า บันทึกบิลค่าน้ำ-ไฟฟ้า และออกเอกสารใบเรียกเก็บเงิน</p>
              </div>

              <form onSubmit={handleGenerateInvoiceSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
                
                {/* Left Column: Form Controls (7 out of 12 columns) */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  {/* Tabs Navigation */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setActiveTab("meters")}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === "meters"
                          ? "bg-white text-slate-800 shadow-sm font-extrabold border border-slate-200/30"
                          : "text-slate-500 hover:text-slate-800 font-semibold"
                      }`}
                    >
                      <span>💧</span>
                      <span>มิเตอร์ & บริการ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("lease")}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === "lease"
                          ? "bg-white text-slate-800 shadow-sm font-extrabold border border-slate-200/30"
                          : "text-slate-500 hover:text-slate-800 font-semibold"
                      }`}
                    >
                      <span>📄</span>
                      <span>สัญญาเช่า & ประกัน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("history")}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === "history"
                          ? "bg-white text-slate-800 shadow-sm font-extrabold border border-slate-200/30"
                          : "text-slate-500 hover:text-slate-800 font-semibold"
                      }`}
                    >
                      <span>📜</span>
                      <span>ประวัติชำระเงิน</span>
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {activeTab === "meters" && (
                    <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                      {/* section 2: ค่าน้ำ & ค่าไฟ (4 columns grid) */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">💧 ค่าน้ำ & ⚡ ค่าไฟ (จดเลขมิเตอร์)</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">มิเตอร์น้ำเดิม</span>
                            <input
                              type="number"
                              value={prevWater}
                              onChange={(e) => setPrevWater(e.target.value)}
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">มิเตอร์น้ำใหม่</span>
                            <input
                              type="number"
                              value={currWater}
                              onChange={(e) => setCurrWater(e.target.value)}
                              placeholder="จดใหม่"
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">มิเตอร์ไฟเดิม</span>
                            <input
                              type="number"
                              value={prevElectric}
                              onChange={(e) => setPrevElectric(e.target.value)}
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">มิเตอร์ไฟใหม่</span>
                            <input
                              type="number"
                              value={currElectric}
                              onChange={(e) => setCurrElectric(e.target.value)}
                              placeholder="จดใหม่"
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* section 3: ค่าบริการเสริม & วันชำระ */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">💰 ค่าบริการเสริม & เบี้ยปรับเลท</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">ค่าทำความสะอาด</span>
                            <input
                              type="number"
                              value={cleaningFee}
                              onChange={(e) => setCleaningFee(e.target.value)}
                              placeholder="0"
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">ค่าอื่นๆ</span>
                            <input
                              type="number"
                              value={otherFee}
                              onChange={(e) => setOtherFee(e.target.value)}
                              placeholder="0"
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-1">วันที่ชำระเงิน</span>
                            <input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => {
                                const newDateStr = e.target.value;
                                setPaymentDate(newDateStr);
                                if (newDateStr) {
                                  const dateObj = new Date(newDateStr);
                                  const day = dateObj.getDate();
                                  if (day >= 6 && day <= 24) {
                                    setLateDays((day - 5).toString());
                                  } else {
                                    setLateDays("0");
                                  }
                                } else {
                                  setLateDays("");
                                }
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-[10px] font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-rose-500 block mb-1">จ่ายเลท (วัน)</span>
                            <input
                              type="number"
                              min="0"
                              value={lateDays}
                              onChange={(e) => setLateDays(e.target.value)}
                              placeholder="0"
                              className="w-full px-2.5 py-2 bg-rose-50/50 border border-rose-100 rounded-lg text-rose-700 text-xs font-bold focus:border-rose-400 transition outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* section 4: หมายเหตุ & สถานะ */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">📝 สถานะจำเพาะ & หมายเหตุ</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">ย้าย (Move out)</span>
                            <input
                              type="text"
                              value={moveOut}
                              onChange={(e) => setMoveOut(e.target.value)}
                              placeholder="รายละเอียดการย้าย"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">ว่าง (Vacant)</span>
                            <input
                              type="text"
                              value={vacant}
                              onChange={(e) => setVacant(e.target.value)}
                              placeholder="สถานะว่าง/ตรวจสอบ"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">หมายเหตุของห้อง</span>
                            <input
                              type="text"
                              value={remark}
                              onChange={(e) => setRemark(e.target.value)}
                              placeholder="เช่น ค้างจ่ายค่าน้ำ, ประสงค์จะย้ายออกเดือนหน้า"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "lease" && (
                    <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                      {/* สัญญาเช่า & ประกัน */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">👤 ข้อมูลผู้เช่า & สัญญาเช่า</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">ชื่อผู้พักอาศัย</span>
                            <input
                              type="text"
                              value={tenantName}
                              onChange={(e) => setTenantName(e.target.value)}
                              placeholder="ว่าง (ไม่มีผู้เช่า)"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">ค่าเช่าห้อง (บาท)</span>
                            <input
                              type="number"
                              value={roomRate}
                              onChange={(e) => setRoomRate(e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 transition outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-1">วันเริ่มสัญญาเช่า</span>
                            <input
                              type="date"
                              value={leaseStartDate}
                              onChange={(e) => setLeaseStartDate(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 outline-none transition"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-1">วันสิ้นสุดสัญญาเช่า</span>
                            <input
                              type="date"
                              value={leaseEndDate}
                              onChange={(e) => setLeaseEndDate(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 outline-none transition"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-1">เงินมัดจำประกัน (บาท)</span>
                            <input
                              type="number"
                              value={deposit}
                              onChange={(e) => setDeposit(e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 outline-none transition"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-1">สถานะสัญญาเช่า</span>
                            <select
                              value={leaseStatus}
                              onChange={(e) => setLeaseStatus(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:border-blue-500 outline-none transition cursor-pointer"
                            >
                              <option value="active">ปกติ (Active)</option>
                              <option value="expired">หมดอายุสัญญา (Expired)</option>
                              <option value="terminated">ยกเลิกสัญญาแล้ว (Terminated)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "history" && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 animate-[fadeIn_0.2s_ease-out] min-h-[300px] flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">📜 ประวัติการเงินรายเดือนย้อนหลัง</span>
                      {loadingHistory ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-10">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                          <span className="text-xs text-slate-400 font-medium">กำลังโหลดประวัติ...</span>
                        </div>
                      ) : paymentHistory.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                          <span className="text-3xl mb-2">📭</span>
                          <span className="text-xs text-slate-400 font-bold">ไม่มีประวัติการชำระเงินย้อนหลัง</span>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase font-black">
                                <th className="py-2">เดือน</th>
                                <th className="py-2">ยอดเงินเรียกเก็บ</th>
                                <th className="py-2">สถานะ</th>
                                <th className="py-2 text-right">หลักฐานสลิป</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                              {paymentHistory.map((h: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-200/30">
                                  <td className="py-2.5 font-mono">{h.month}</td>
                                  <td className="py-2.5 font-bold text-slate-800">{h.amount.toLocaleString()} ฿</td>
                                  <td className="py-2.5">
                                    {h.payment_status === "paid" ? (
                                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black rounded-full">ชำระแล้ว</span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black rounded-full">ค้างชำระ</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right">
                                    {h.slip_url ? (
                                      <a
                                        href={h.slip_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 hover:underline text-[11px] font-black"
                                      >
                                        ดูรูปภาพสลิป ↗
                                      </a>
                                    ) : (
                                      <span className="text-slate-300 font-normal">ไม่มีข้อมูล</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Live Invoice Preview & Actions (5 out of 12 columns) */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 h-full min-h-[420px] lg:min-h-full">
                  <div className="space-y-4">
                    
                    {/* Header Segment: Room ID / Payment Status Toggle */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">💳 สถานะการชำระเงิน</span>
                      
                      <div className="flex bg-slate-200/60 p-1 rounded-xl w-full border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setPaymentStatus("pending")}
                          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            paymentStatus === "pending"
                              ? "bg-rose-600 text-white shadow-sm font-extrabold"
                              : "text-slate-500 hover:text-slate-800 font-semibold"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${paymentStatus === "pending" ? "bg-white animate-pulse" : "bg-rose-500"}`} />
                          <span>ค้างชำระ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentStatus("paid")}
                          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            paymentStatus === "paid"
                              ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                              : "text-slate-500 hover:text-slate-800 font-semibold"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${paymentStatus === "paid" ? "bg-white animate-pulse" : "bg-emerald-500"}`} />
                          <span>ชำระแล้ว</span>
                        </button>
                      </div>
                    </div>

                    {/* Breakdown List */}
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">สรุปค่าใช้จ่ายประจำเดือน</span>
                      
                      <div className="space-y-2">
                        {/* Rent fee */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">ค่าเช่าห้องพัก</span>
                          <span className="font-extrabold text-slate-800">{parsedLiveRate.toLocaleString('en-US', {minimumFractionDigits: 2})} ฿</span>
                        </div>

                        {/* Water Fee */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">ค่าน้ำ ({waterUnitsUsed.toLocaleString()} หน่วย × {waterRate})</span>
                          <span className="font-extrabold text-slate-800">{waterCost.toLocaleString('en-US', {minimumFractionDigits: 2})} ฿</span>
                        </div>

                        {/* Electricity Fee */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">ค่าไฟ ({electricUnitsUsed.toLocaleString()} หน่วย × {electricRate})</span>
                          <span className="font-extrabold text-slate-800">{electricCost.toLocaleString('en-US', {minimumFractionDigits: 2})} ฿</span>
                        </div>

                        {/* Cleaning Fee */}
                        {cFee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold">ค่าทำความสะอาด</span>
                            <span className="font-extrabold text-orange-600">{cFee.toLocaleString('en-US', {minimumFractionDigits: 2})} ฿</span>
                          </div>
                        )}

                        {/* Other Fees */}
                        {oFee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold">ค่าบริการอื่นๆ</span>
                            <span className="font-extrabold text-orange-600">{oFee.toLocaleString('en-US', {minimumFractionDigits: 2})} ฿</span>
                          </div>
                        )}

                        {/* Late Penalty */}
                        {fineCost > 0 && (
                          <div className="flex justify-between items-center text-xs bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 text-rose-700 font-black">
                            <span className="flex items-center gap-1">⏰ เบี้ยปรับเลท ({lDays} วัน)</span>
                            <span>{fineCost.toLocaleString('en-US', {minimumFractionDigits: 2})} ฿</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Net Total Amount Display */}
                    <div className="bg-blue-600 text-white p-4 rounded-xl border border-blue-500 shadow-md shadow-blue-600/10 space-y-1">
                      <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest block">ยอดรวมสุทธิ (Net Total)</span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-black">{liveTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        <span className="text-xs font-bold text-blue-100">THB ฿</span>
                      </div>
                    </div>

                    {/* Success Notification */}
                    {invoiceSuccess && (
                      <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-600 text-xs font-black text-center animate-bounce">
                        🎉 ออกบิลรวม {generatedAmount.toLocaleString()} ฿ สำเร็จ!
                      </div>
                    )}

                  </div>

                  {/* Submit / Cancel Buttons */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-slate-200 mt-4 lg:mt-auto">
                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>💾</span>
                      <span>บันทึกข้อมูล & ออกใบเสร็จ</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPayRoom(selectedRoom)}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-750 hover:to-teal-750 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🛡️</span>
                      <span>ชำระผ่าน PromptPay QR (AI)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200/80 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>ยกเลิก (Cancel)</span>
                    </button>
                  </div>

                </div>

              </form>

              {/* Render PromptPayQRCard if payRoom is active */}
              {payRoom && (
                <PromptPayQRCard
                  amount={liveTotalAmount}
                  title={`ค่าเช่าและค่าบริการห้อง ${payRoom.number} ประจำรอบบิล`}
                  type="dorm"
                  targetId={String(payRoom.id)}
                  onClose={() => setPayRoom(null)}
                  onSuccess={async () => {
                    const today = new Date().toISOString().split("T")[0];
                    const updatedRoomFields = {
                      tenant: tenantName,
                      rate: parsedLiveRate,
                      waterMeterPrev: parseFloat(prevWater) || selectedRoom.waterMeterPrev || 0,
                      waterMeter: parseFloat(currWater) || selectedRoom.waterMeter || 0,
                      electricityMeterPrev: parseFloat(prevElectric) || selectedRoom.electricityMeterPrev || 0,
                      electricityMeter: parseFloat(currElectric) || selectedRoom.electricityMeter || 0,
                      waterCost: waterCost,
                      electricCost: electricCost,
                      cleaningFee: cFee,
                      otherFee: oFee,
                      lateDays: lDays,
                      fineCost: fineCost,
                      paymentStatus: "paid" as const,
                      paymentDate: today,
                      remark: remark,
                      moveOut: moveOut,
                      vacant: vacant,
                      leaseStartDate: leaseStartDate || "",
                      leaseEndDate: leaseEndDate || "",
                      deposit: parseFloat(deposit) || 0,
                      leaseStatus: leaseStatus || "active"
                    };

                    // Update state locally
                    setRooms(prev => prev.map(r => {
                      if (r.number === selectedRoom.number && r.floor === selectedRoom.floor) {
                        return { ...r, ...updatedRoomFields };
                      }
                      return r;
                    }));

                    // Save to DB
                    try {
                      await updateDormRoom(activeDorm, selectedRoom.number, { ...selectedRoom, ...updatedRoomFields });
                      triggerToast(`ชำระเงินห้อง ${selectedRoom.number} สำเร็จผ่าน PromptPay AI! 🎉`);
                      setPayRoom(null);
                      setSelectedRoom(null);
                    } catch (err) {
                      console.error("Failed to update room status on QR success:", err);
                      triggerToast("เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยังเซิร์ฟเวอร์ ❌");
                    }
                  }}
                />
              )}

            </div>
          </div>
        );
      })()}

      {/* Custom Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-md w-full animate-[scaleUp_0.2s_ease-out] space-y-5">
            <div className="flex items-center gap-3 text-rose-500">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-md font-black text-slate-800">ยืนยันการรีเซ็ตระบบข้อมูลหอพัก</h3>
            </div>
            
            <p className="text-slate-500 text-xs leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลผู้เช่าและยอดเรียกเก็บเงินของห้องพักทั้งหมดทุกตึก กลับเป็น **ค่าเริ่มต้น (ว่างเปล่า)**? 
              การดำเนินการนี้จะไม่สามารถย้อนกลับได้
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await resetDormRooms();
                    const allRooms = await fetchDormRooms();
                    setRooms26_20(allRooms.filter(r => r.dormKey === "26_20"));
                    setRooms26_577(allRooms.filter(r => r.dormKey === "26_577"));
                    setRooms73_17(allRooms.filter(r => r.dormKey === "73_17"));
                    setShowResetConfirm(false);
                    triggerToast("ล้างข้อมูลห้องพักทั้งหมดเรียบร้อยแล้ว!");
                  } catch (err) {
                    console.error("Failed to reset dorm rooms:", err);
                    triggerToast("เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล!");
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition duration-150 shadow-md shadow-rose-600/10 cursor-pointer"
              >
                ล้างข้อมูลทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Rollover Confirmation Modal */}
      {showRolloverConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-md w-full animate-[scaleUp_0.2s_ease-out] space-y-5">
            <div className="flex items-center gap-3 text-blue-500">
              <span className="text-2xl">🔄</span>
              <h3 className="text-md font-black text-slate-800">ยืนยันการขึ้นรอบบิลเดือนใหม่</h3>
            </div>
            
            <p className="text-slate-500 text-xs leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการเริ่มขึ้นรอบบิลเดือนใหม่?
              <br /><br />
              ระบบจะย้าย **เลขมิเตอร์ปัจจุบัน** ไปตั้งต้นเป็น **เลขมิเตอร์เดิม** ของเดือนใหม่ และเคลียร์ยอดบิลสะสมทั้งหมดให้กลับเป็น **0** เพื่อเริ่มรอบบิลใหม่ โดยที่ข้อมูลผู้เช่าและอัตราค่าเช่าห้องพักเดิมจะยังคงอยู่และไม่สูญหาย!
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRolloverConfirm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await rolloverDormRooms();
                    const allRooms = await fetchDormRooms();
                    setRooms26_20(allRooms.filter(r => r.dormKey === "26_20"));
                    setRooms26_577(allRooms.filter(r => r.dormKey === "26_577"));
                    setRooms73_17(allRooms.filter(r => r.dormKey === "73_17"));
                    setShowRolloverConfirm(false);
                    triggerToast("ขึ้นรอบบิลใหม่และซิงค์มิเตอร์เรียบร้อย!");
                  } catch (err) {
                    console.error("Failed to rollover dorm rooms:", err);
                    triggerToast("เกิดข้อผิดพลาดในการขึ้นรอบบิลใหม่!");
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition duration-150 shadow-md shadow-blue-600/10 cursor-pointer"
              >
                ขึ้นรอบใหม่ทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-[fadeIn_0.2s_ease-out] text-xs font-bold border border-slate-800 backdrop-blur-md">
          <span>{showToast.includes("ล้าง") ? "🧹" : "🎉"}</span>
          <span>{showToast}</span>
        </div>
      )}

    </div>
  );
}
