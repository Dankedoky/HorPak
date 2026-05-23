"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, Fragment } from "react";
import { authFetch } from "@/lib/api";

// Interfaces matching API response schemas.py
interface SpreadsheetRoom {
  room_id: number;
  number: string;
  floor: number;
  dorm_key: string;
  rate: number;
  tenant: string;
  water_meter_prev: number;
  water_meter: number;
  electricity_meter_prev: number;
  electricity_meter: number;
  water_cost: number;
  electric_cost: number;
  cleaning_fee: number;
  other_fee: number;
  fine_cost: number;
  payment_status: string;
  remark: string;
  move_out: string;
  vacant: string;
  paid_at: string | null;
}

interface UtilityTrend {
  month: string;
  water_units: number;
  water_cost: number;
  electricity_units: number;
  electricity_cost: number;
}

type DormType = "26_20" | "26_577" | "73_17";

const DORM_NAMES: Record<DormType, string> = {
  "26_20": "หอพัก 26/20",
  "26_577": "หอพัก 26/577",
  "73_17": "หอพัก 73/17",
};

// Custom Helpers
function formatMoney(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthThai(monthStr: string) {
  if (!monthStr) return "";
  const parts = monthStr.split("-");
  if (parts.length !== 2) return monthStr;
  const [year, month] = parts;
  const thMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const idx = parseInt(month, 10) - 1;
  const thYear = parseInt(year, 10) + 543;
  return `${thMonths[idx]} ${thYear}`;
}

function formatMonthThaiShort(monthStr: string) {
  if (!monthStr) return "";
  const parts = monthStr.split("-");
  if (parts.length !== 2) return monthStr;
  const [year, month] = parts;
  const thMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  const idx = parseInt(month, 10) - 1;
  const thYear = (parseInt(year, 10) + 543).toString().slice(-2);
  return `${thMonths[idx]} ${thYear}`;
}

export default function UtilitiesSpreadsheetPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Tab State: "grid" for Excel Spreadsheet, "trends" for History Analysis
  const [activeTab, setActiveTab] = useState<"grid" | "trends">("grid");

  // Selection states
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthsList, setMonthsList] = useState<string[]>([]);
  const [selectedDorm, setSelectedDorm] = useState<DormType>("26_20");

  // Data states
  const [roomsData, setRoomsData] = useState<SpreadsheetRoom[]>([]);
  const [trendsData, setTrendsData] = useState<UtilityTrend[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTrendsLoading, setIsTrendsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Quick Edit Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<SpreadsheetRoom | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>("");

  // Quick Edit Form States
  const [formRate, setFormRate] = useState<number>(0);
  const [formWaterPrev, setFormWaterPrev] = useState<number>(0);
  const [formWaterCurr, setFormWaterCurr] = useState<number>(0);
  const [formElecPrev, setFormElecPrev] = useState<number>(0);
  const [formElecCurr, setFormElecCurr] = useState<number>(0);
  const [formCleaning, setFormCleaning] = useState<number>(0);
  const [formOther, setFormOther] = useState<number>(0);
  const [formRemark, setFormRemark] = useState<string>("");
  const [formMoveOut, setFormMoveOut] = useState<string>("");
  const [formVacant, setFormVacant] = useState<string>("");
  const [formStatus, setFormStatus] = useState<string>("unpaid");

  // Floating HTML Glassmorphic Tooltip state
  const [trendTooltip, setTrendTooltip] = useState<{
    month: string;
    electricity: number;
    water: number;
    x: number;
    y: number;
  } | null>(null);

  // Generate last 12 months list dynamically ( Thai context, local time )
  useEffect(() => {
    const list: string[] = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      list.push(`${y}-${String(m).padStart(2, "0")}`);
      date.setMonth(date.getMonth() - 1);
    }
    setMonthsList(list);
    // Set default selected month to current billing month
    setSelectedMonth(list[0]);
  }, []);

  // Fetch rooms spreadsheet data when selected month changes
  useEffect(() => {
    if (!selectedMonth) return;
    setIsLoading(true);
    setErrorMsg("");
    
    authFetch(`${API_BASE}/rooms/spreadsheet/${selectedMonth}/`)
      .then((res) => {
        if (!res.ok) throw new Error("ไม่สามารถเชื่อมต่อดึงข้อมูล API ได้");
        return res.json();
      })
      .then((data: SpreadsheetRoom[]) => {
        setRoomsData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Fetch spreadsheet error:", err);
        setErrorMsg("เกิดข้อผิดพลาดในการดึงข้อมูลตารางน้ำไฟ กรุณาตรวจสอบสถานะเซิร์ฟเวอร์หลัก");
        setIsLoading(false);
      });
  }, [selectedMonth, API_BASE]);

  // Fetch trend data when tab switches to 'trends'
  useEffect(() => {
    if (activeTab !== "trends") return;
    setIsTrendsLoading(true);
    authFetch(`${API_BASE}/rooms/utility-history-trends/`)
      .then((res) => {
        if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลแนวโน้มได้");
        return res.json();
      })
      .then((data: UtilityTrend[]) => {
        setTrendsData(data);
        setIsTrendsLoading(false);
      })
      .catch((err) => {
        console.error("Fetch trends error:", err);
        setIsTrendsLoading(false);
      });
  }, [activeTab, API_BASE]);

  // Filtered rooms data based on selected Dormitory
  const filteredRooms = useMemo(() => {
    return roomsData.filter((r) => r.dorm_key === selectedDorm);
  }, [roomsData, selectedDorm]);

  // Group rooms data by floors (Excel style grouped row display)
  const groupedRooms = useMemo(() => {
    const groups: { [key: number]: SpreadsheetRoom[] } = {};
    filteredRooms.forEach((room) => {
      if (!groups[room.floor]) {
        groups[room.floor] = [];
      }
      groups[room.floor].push(room);
    });
    // Return sorted keys (floors)
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .map((floor) => ({
        floor,
        rooms: groups[floor].sort((a, b) => a.number.localeCompare(b.number))
      }));
  }, [filteredRooms]);

  // Grand Totals calculator for the selected dormitory
  const grandTotals = useMemo(() => {
    let rateSum = 0;
    let waterUnitsSum = 0;
    let waterCostSum = 0;
    let elecUnitsSum = 0;
    let elecCostSum = 0;
    let cleaningSum = 0;
    let otherSum = 0;
    let totalSum = 0;
    let pendingSum = 0;

    filteredRooms.forEach((r) => {
      const waterUnits = Math.max(0, r.water_meter - r.water_meter_prev);
      const elecUnits = Math.max(0, r.electricity_meter - r.electricity_meter_prev);
      
      rateSum += r.rate || 0;
      waterUnitsSum += waterUnits;
      waterCostSum += r.water_cost || 0;
      elecUnitsSum += elecUnits;
      elecCostSum += r.electric_cost || 0;
      cleaningSum += r.cleaning_fee || 0;
      otherSum += r.other_fee || 0;

      const roomTotal = (r.rate || 0) + (r.water_cost || 0) + (r.electric_cost || 0) + (r.cleaning_fee || 0) + (r.other_fee || 0) + (r.fine_cost || 0);
      totalSum += roomTotal;

      if (r.payment_status !== "paid" && r.vacant !== "ว่าง") {
        pendingSum += roomTotal;
      }
    });

    return {
      rateSum,
      waterUnitsSum,
      waterCostSum,
      elecUnitsSum,
      elecCostSum,
      cleaningSum,
      otherSum,
      totalSum,
      pendingSum
    };
  }, [filteredRooms]);

  // Handle click on row to quick edit
  const handleOpenEdit = (room: SpreadsheetRoom) => {
    setEditingRoom(room);
    setFormRate(room.rate);
    setFormWaterPrev(room.water_meter_prev);
    setFormWaterCurr(room.water_meter);
    setFormElecPrev(room.electricity_meter_prev);
    setFormElecCurr(room.electricity_meter);
    setFormCleaning(room.cleaning_fee);
    setFormOther(room.other_fee);
    setFormRemark(room.remark || "");
    setFormMoveOut(room.move_out || "");
    setFormVacant(room.vacant || "");
    setFormStatus(room.payment_status || "unpaid");
    
    setSaveSuccess("");
    setIsDrawerOpen(true);
  };

  // Live Calculations in Form
  const liveWaterUnits = Math.max(0, formWaterCurr - formWaterPrev);
  const liveWaterCost = liveWaterUnits * 17.0;
  const liveElecUnits = Math.max(0, formElecCurr - formElecPrev);
  const liveElecCost = liveElecUnits * 7.0;
  const liveTotal = formRate + liveWaterCost + liveElecCost + formCleaning + formOther;

  // Submit quick edit payload to server
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !selectedMonth) return;

    setIsSaving(true);
    const payload = {
      rate: formRate,
      water_meter_prev: formWaterPrev,
      water_meter: formWaterCurr,
      electricity_meter_prev: formElecPrev,
      electricity_meter: formElecCurr,
      cleaning_fee: formCleaning,
      other_fee: formOther,
      remark: formRemark,
      move_out: formMoveOut,
      vacant: formVacant,
      payment_status: formStatus
    };

    authFetch(`${API_BASE}/rooms/spreadsheet/${selectedMonth}/${editingRoom.room_id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error("ไม่สามารถบันทึกข้อมูลได้");
        return res.json();
      })
      .then(() => {
        setSaveSuccess("บันทึกข้อมูลสำเร็จอย่างสมบูรณ์!");
        
        // Refresh local data list
        setRoomsData((prev) =>
          prev.map((r) =>
            r.room_id === editingRoom.room_id
              ? {
                  ...r,
                  rate: formRate,
                  water_meter_prev: formWaterPrev,
                  water_meter: formWaterCurr,
                  electricity_meter_prev: formElecPrev,
                  electricity_meter: formElecCurr,
                  water_cost: liveWaterCost,
                  electric_cost: liveElecCost,
                  cleaning_fee: formCleaning,
                  other_fee: formOther,
                  remark: formRemark,
                  move_out: formMoveOut,
                  vacant: formVacant,
                  payment_status: formStatus
                }
              : r
          )
        );

        setTimeout(() => {
          setIsDrawerOpen(false);
          setEditingRoom(null);
          setSaveSuccess("");
        }, 1200);
      })
      .catch((err) => {
        console.error("Save error:", err);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองอีกครั้ง");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  // SVG Trend Chart Dimensions
  const chartW = 900;
  const chartH = 320;
  const paddingX = 60;
  const paddingY = 40;

  // Compute Max bounds for SVG scaling
  const maxTrendUnits = useMemo(() => {
    if (trendsData.length === 0) return 100;
    const vals = trendsData.flatMap((t) => [t.water_units, t.electricity_units]);
    return Math.max(...vals, 10) * 1.15;
  }, [trendsData]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] bg-teal-50 border border-teal-100 px-3 py-1 rounded-full mb-3 inline-block">
            UTILITIES DATABASE SYSTEM
          </span>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            📊 ประวัติค่าน้ำ-ค่าไฟหอพัก
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ฐานข้อมูลรวมตัวเลขมิเตอร์ ยูนิตการใช้ และสถานะทางการเงินรายเดือน สลับดูย้อนหลังสูงสุด 1 ปี
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dormitory"
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black shadow-sm transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            กลับหน้าหอพัก
          </Link>
        </div>
      </div>

      {/* Dormitory Switch Selector Tabs (Premium Pastel Segmented UI) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-1.5">
        {(Object.keys(DORM_NAMES) as DormType[]).map((dormKey) => {
          const isActive = selectedDorm === dormKey;
          return (
            <button
              key={dormKey}
              onClick={() => setSelectedDorm(dormKey)}
              className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs font-black tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 border ${
                isActive
                  ? "bg-teal-50 text-teal-700 border-teal-200/60 shadow-inner scale-[0.98]"
                  : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent"
              }`}
            >
              <span className="text-base">🏢</span>
              <span>{DORM_NAMES[dormKey]}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("grid")}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === "grid"
              ? "border-teal-600 text-teal-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>🧾</span> Spreadsheet บันทึกค่าน้ำ-ไฟ ({DORM_NAMES[selectedDorm]})
        </button>
        <button
          onClick={() => setActiveTab("trends")}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === "trends"
              ? "border-teal-600 text-teal-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>📈</span> รายงานวิเคราะห์แนวโน้มสะสมภาพรวมทั้งหมด
        </button>
      </div>

      {/* ERROR CONTAINER */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-shake">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-extrabold">เกิดความขัดข้องทางเทคนิค</p>
            <p className="text-xs text-rose-600 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* TAB 1: SPREADSHEET GRID */}
      {activeTab === "grid" && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                เลือกปี/รอบบิล:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition cursor-pointer"
              >
                {monthsList.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthThai(m)} ({m})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-100 inline-block"></span>
                ค่าเช่าห้องพัก
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-amber-50 border border-amber-100 inline-block"></span>
                ระบบไฟฟ้า (ยูนิตละ 7 ฿)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-sky-50 border border-sky-100 inline-block"></span>
                ระบบประปา (ยูนิตละ 17 ฿)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-purple-50 border border-purple-100 inline-block"></span>
                บริการทำความสะอาด & อื่นๆ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-50 border border-rose-100 inline-block"></span>
                ยอดรวมบิลห้องพัก
              </span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-slate-600">
                รายรับคาดหวังรวมของหอ
              </span>
              <div className="text-xl font-black text-slate-800 tracking-tight mt-1">
                {formatMoney(grandTotals.totalSum)} ฿
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-amber-600">
                ยอดค้างชำระหอสะสม
              </span>
              <div className="text-xl font-black text-amber-600 tracking-tight mt-1">
                {formatMoney(grandTotals.pendingSum)} ฿
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-amber-500">
                ไฟฟ้าที่ใช้รวม (หอนี้)
              </span>
              <div className="text-xl font-black text-amber-500 tracking-tight mt-1 flex items-baseline gap-1">
                {grandTotals.elecUnitsSum.toLocaleString("th-TH", { maximumFractionDigits: 1 })}{" "}
                <span className="text-xs text-slate-400 font-normal">หน่วย ({formatMoney(grandTotals.elecCostSum)} ฿)</span>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-sky-500">
                ประปาที่ใช้รวม (หอนี้)
              </span>
              <div className="text-xl font-black text-sky-500 tracking-tight mt-1 flex items-baseline gap-1">
                {grandTotals.waterUnitsSum.toLocaleString("th-TH", { maximumFractionDigits: 1 })}{" "}
                <span className="text-xs text-slate-400 font-normal">หน่วย ({formatMoney(grandTotals.waterCostSum)} ฿)</span>
              </div>
            </div>
          </div>

          {/* MAIN SPREADSHEET TABLE GRID CONTAINER */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-semibold tracking-wide">
                กำลังประกอบร่างและเชื่อมต่อตารางกริดน้ำ-ไฟ...
              </p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm text-slate-400 font-bold">
              🚫 ไม่พบห้องพักที่ลงทะเบียนไว้ภายใต้ {DORM_NAMES[selectedDorm]} ในรอบบิลนี้
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-4 text-center w-[70px]">แก้ไข</th>
                      <th className="py-4 px-3 w-[90px]">ห้องพัก</th>
                      <th className="py-4 px-3 w-[150px]">ผู้เช่า</th>
                      
                      {/* Room Rates */}
                      <th className="py-4 px-3 bg-emerald-50/50 text-emerald-800 text-right w-[110px]">ค่าเช่าห้อง</th>
                      
                      {/* Electricity Meters */}
                      <th className="py-4 px-3 bg-amber-50/30 text-amber-800 text-right w-[95px]">ไฟ ครั้งก่อน</th>
                      <th className="py-4 px-3 bg-amber-50/30 text-amber-800 text-right w-[95px]">ไฟ ครั้งนี้</th>
                      <th className="py-4 px-3 bg-amber-50/50 text-amber-800 text-right w-[80px]">ไฟ หน่วยที่ใช้</th>
                      <th className="py-4 px-3 bg-amber-50/50 text-amber-800 text-right w-[100px]">ค่าไฟ (7 ฿)</th>
                      
                      {/* Water Meters */}
                      <th className="py-4 px-3 bg-sky-50/30 text-sky-800 text-right w-[95px]">น้ำ ครั้งก่อน</th>
                      <th className="py-4 px-3 bg-sky-50/30 text-sky-800 text-right w-[95px]">น้ำ ครั้งนี้</th>
                      <th className="py-4 px-3 bg-sky-50/50 text-sky-800 text-right w-[80px]">น้ำ หน่วยที่ใช้</th>
                      <th className="py-4 px-3 bg-sky-50/50 text-sky-800 text-right w-[100px]">ค่าน้ำ (17 ฿)</th>
                      
                      {/* Fees */}
                      <th className="py-4 px-3 bg-purple-50/50 text-purple-800 text-right w-[90px]">ทำความสะอาด</th>
                      <th className="py-4 px-3 bg-purple-50/50 text-purple-800 text-right w-[90px]">ค่าบริการอื่นๆ</th>
                      
                      {/* Total and Statuses */}
                      <th className="py-4 px-3 bg-rose-50/50 text-rose-800 text-right w-[120px]">ยอดรวมสุทธิ</th>
                      <th className="py-4 px-3 text-center w-[100px]">การชำระเงิน</th>
                      <th className="py-4 px-4 w-[160px]">หมายเหตุ</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {groupedRooms.map((floorGroup) => {
                      // Calculate floor sub-totals
                      let floorRate = 0;
                      let floorWaterUnits = 0;
                      let floorWaterCost = 0;
                      let floorElecUnits = 0;
                      let floorElecCost = 0;
                      let floorCleaning = 0;
                      let floorOther = 0;
                      let floorTotal = 0;

                      floorGroup.rooms.forEach((rm) => {
                        floorRate += rm.rate || 0;
                        floorWaterUnits += Math.max(0, rm.water_meter - rm.water_meter_prev);
                        floorWaterCost += rm.water_cost || 0;
                        floorElecUnits += Math.max(0, rm.electricity_meter - rm.electricity_meter_prev);
                        floorElecCost += rm.electric_cost || 0;
                        floorCleaning += rm.cleaning_fee || 0;
                        floorOther += rm.other_fee || 0;
                        floorTotal += (rm.rate || 0) + (rm.water_cost || 0) + (rm.electric_cost || 0) + (rm.cleaning_fee || 0) + (rm.other_fee || 0) + (rm.fine_cost || 0);
                      });

                      return (
                        <Fragment key={floorGroup.floor}>
                          {/* Floor Header separator row */}
                          <tr className="bg-slate-100/70 text-slate-700 font-extrabold text-[11px]">
                            <td colSpan={17} className="py-2.5 px-4 tracking-wide flex items-center gap-1.5">
                              <span>🏢</span> ชั้น {floorGroup.floor} (จำนวน {floorGroup.rooms.length} ห้องพัก)
                            </td>
                          </tr>

                          {/* Room rows */}
                          {floorGroup.rooms.map((room) => {
                            const waterUnits = Math.max(0, room.water_meter - room.water_meter_prev);
                            const elecUnits = Math.max(0, room.electricity_meter - room.electricity_meter_prev);
                            const rowTotal = (room.rate || 0) + (room.water_cost || 0) + (room.electric_cost || 0) + (room.cleaning_fee || 0) + (room.other_fee || 0) + (room.fine_cost || 0);

                            return (
                              <tr
                                key={room.room_id}
                                className={`hover:bg-slate-50 transition-colors duration-150 group cursor-pointer ${
                                  room.vacant === "ว่าง" ? "text-slate-400 bg-slate-50/20" : "text-slate-700"
                                }`}
                                onClick={() => handleOpenEdit(room)}
                              >
                                <td className="py-2.5 px-4 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEdit(room);
                                    }}
                                    className="p-1 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-100 text-teal-700 text-[10px] font-black tracking-wide transition"
                                  >
                                    แก้ไข
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 font-extrabold text-[13px] text-slate-800">
                                  {room.number}
                                </td>
                                <td className="py-2.5 px-3 truncate max-w-[140px] font-bold">
                                  {room.vacant === "ว่าง" ? (
                                    <span className="text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md">
                                      ห้องว่าง
                                    </span>
                                  ) : (
                                    room.tenant || "ไม่ระบุ"
                                  )}
                                  {room.move_out && (
                                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded ml-1.5 animate-pulse">
                                      ออก: {room.move_out}
                                    </span>
                                  )}
                                </td>
                                
                                {/* Room Rates */}
                                <td className="py-2.5 px-3 bg-emerald-50/30 text-emerald-800 text-right font-semibold">
                                  {formatMoney(room.rate)}
                                </td>
                                
                                {/* Electricity */}
                                <td className="py-2.5 px-3 bg-amber-50/10 text-amber-800/80 text-right">
                                  {room.electricity_meter_prev.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-3 bg-amber-50/10 text-amber-800/80 text-right font-semibold">
                                  {room.electricity_meter.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-3 bg-amber-50/20 text-amber-800 text-right font-extrabold">
                                  {elecUnits > 0 ? elecUnits.toFixed(1) : "-"}
                                </td>
                                <td className="py-2.5 px-3 bg-amber-50/30 text-amber-900 text-right font-black">
                                  {formatMoney(room.electric_cost)}
                                </td>
                                
                                {/* Water */}
                                <td className="py-2.5 px-3 bg-sky-50/10 text-sky-800/80 text-right">
                                  {room.water_meter_prev.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-3 bg-sky-50/10 text-sky-800/80 text-right font-semibold">
                                  {room.water_meter.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-3 bg-sky-50/20 text-sky-800 text-right font-extrabold">
                                  {waterUnits > 0 ? waterUnits.toFixed(1) : "-"}
                                </td>
                                <td className="py-2.5 px-3 bg-sky-50/30 text-sky-900 text-right font-black">
                                  {formatMoney(room.water_cost)}
                                </td>
                                
                                {/* Fees */}
                                <td className="py-2.5 px-3 bg-purple-50/20 text-purple-800 text-right font-semibold">
                                  {room.cleaning_fee > 0 ? formatMoney(room.cleaning_fee) : "-"}
                                </td>
                                <td className="py-2.5 px-3 bg-purple-50/20 text-purple-800 text-right font-semibold">
                                  {room.other_fee > 0 ? formatMoney(room.other_fee) : "-"}
                                </td>
                                
                                {/* Net Total */}
                                <td className="py-2.5 px-3 bg-rose-50/30 text-rose-800 text-right font-black text-[13px]">
                                  {formatMoney(rowTotal)}
                                </td>
                                
                                {/* Status */}
                                <td className="py-2.5 px-3 text-center">
                                  {room.vacant === "ว่าง" ? (
                                    <span className="text-[9px] text-slate-400 font-bold">-</span>
                                  ) : room.payment_status === "paid" ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      ชำระแล้ว
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                                      ค้างชำระ
                                    </span>
                                  )}
                                </td>
                                
                                {/* Remarks */}
                                <td className="py-2.5 px-4 text-slate-400 font-semibold truncate max-w-[140px] italic">
                                  {room.remark || "-"}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Floor Subtotal Row */}
                          <tr className="bg-slate-50 text-slate-600 font-black text-[10.5px] border-b border-slate-200">
                            <td colSpan={3} className="py-2 px-4 text-right uppercase tracking-wider">
                              รวมสะสมชั้น {floorGroup.floor}:
                            </td>
                            <td className="py-2 px-3 text-right bg-emerald-50/40 text-emerald-800 border-t border-emerald-100">
                              {formatMoney(floorRate)}
                            </td>
                            <td colSpan={2} className="bg-amber-50/5"></td>
                            <td className="py-2 px-3 text-right bg-amber-50/20 text-amber-800 border-t border-amber-100">
                              {floorElecUnits.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-right bg-amber-50/30 text-amber-900 border-t border-amber-100">
                              {formatMoney(floorElecCost)}
                            </td>
                            <td colSpan={2} className="bg-sky-50/5"></td>
                            <td className="py-2 px-3 text-right bg-sky-50/20 text-sky-800 border-t border-sky-100">
                              {floorWaterUnits.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-right bg-sky-50/30 text-sky-900 border-t border-sky-100">
                              {formatMoney(floorWaterCost)}
                            </td>
                            <td className="py-2 px-3 text-right bg-purple-50/20 text-purple-800 border-t border-purple-100">
                              {formatMoney(floorCleaning)}
                            </td>
                            <td className="py-2 px-3 text-right bg-purple-50/20 text-purple-800 border-t border-purple-100">
                              {formatMoney(floorOther)}
                            </td>
                            <td className="py-2 px-3 text-right bg-rose-50/30 text-rose-800 font-black border-t border-rose-200 text-[12px]">
                              {formatMoney(floorTotal)}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </Fragment>
                      );
                    })}

                    {/* GRAND TOTALS ROW */}
                    <tr className="bg-slate-900 text-white font-black text-[12px] uppercase tracking-wider">
                      <td colSpan={3} className="py-4 px-4 text-right tracking-widest text-slate-300 whitespace-nowrap">
                        ⭐ รวมสะสมเฉพาะ {DORM_NAMES[selectedDorm]} (GRAND TOTALS):
                      </td>
                      <td className="py-4 px-3 text-right text-emerald-300 bg-slate-800/80 whitespace-nowrap">
                        {formatMoney(grandTotals.rateSum)} ฿
                      </td>
                      <td colSpan={2} className="bg-slate-900"></td>
                      <td className="py-4 px-3 text-right text-amber-300 bg-slate-800/60 whitespace-nowrap">
                        {grandTotals.elecUnitsSum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-4 px-3 text-right text-amber-300 bg-slate-800/80 whitespace-nowrap">
                        {formatMoney(grandTotals.elecCostSum)} ฿
                      </td>
                      <td colSpan={2} className="bg-slate-900"></td>
                      <td className="py-4 px-3 text-right text-sky-300 bg-slate-800/60 whitespace-nowrap">
                        {grandTotals.waterUnitsSum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-4 px-3 text-right text-sky-300 bg-slate-800/80 whitespace-nowrap">
                        {formatMoney(grandTotals.waterCostSum)} ฿
                      </td>
                      <td className="py-4 px-3 text-right text-purple-300 bg-slate-800/80 whitespace-nowrap">
                        {formatMoney(grandTotals.cleaningSum)} ฿
                      </td>
                      <td className="py-4 px-3 text-right text-purple-300 bg-slate-800/80 whitespace-nowrap">
                        {formatMoney(grandTotals.otherSum)} ฿
                      </td>
                      <td className="py-4 px-3 text-right text-rose-300 bg-slate-800 border-l border-slate-700 text-[14px] whitespace-nowrap">
                        {formatMoney(grandTotals.totalSum)} ฿
                      </td>
                      <td colSpan={2} className="bg-slate-900"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UTILITY HISTORY TRENDS */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          {isTrendsLoading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-semibold tracking-wide">
                กำลังรวบรวมประวัติการใช้งานย้อนหลังจากระบบฐานข้อมูลย้อนหลัง...
              </p>
            </div>
          ) : trendsData.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm text-slate-400 font-bold">
              🚫 ไม่พบข้อมูลประวัติค่าน้ำค่าไฟในฐานข้อมูลย้อนหลัง 1 ปี
            </div>
          ) : (
            <div className="space-y-6">
              {/* Premium Interactive Graph Panel */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <span>📈</span> กราฟวิเคราะห์แนวโน้มหน่วยการใช้น้ำและไฟรวมทุกหอพักในเครือย้อนหลัง (12 เดือน)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    วิเคราะห์ความต้องการพลังงานและทรัพยากรสะสมของธุรกิจทั้งหมด เพื่อประเมินผลประสิทธิภาพภาพรวมการเงิน
                  </p>
                </div>

                {/* SVG Polyline Chart */}
                <div className="overflow-x-auto relative">
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full overflow-visible"
                    style={{ minWidth: 700 }}
                  >
                    {/* Background Gradients & Glow definitions */}
                    <defs>
                      <linearGradient id="chartElecGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="chartWaterGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                      </linearGradient>
                      <filter id="elecGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#f59e0b" floodOpacity="0.25" />
                      </filter>
                      <filter id="waterGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#0ea5e9" floodOpacity="0.25" />
                      </filter>
                    </defs>

                    {/* Y-Axis Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y = paddingY + (chartH - paddingY * 2) * (1 - pct);
                      return (
                        <g key={i}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={chartW - paddingX}
                            y2={y}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                            strokeDasharray={i > 0 && i < 4 ? "4 4" : "0"}
                          />
                          <text
                            x={paddingX - 12}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#94a3b8"
                            fontWeight="black"
                          >
                            {Math.round(maxTrendUnits * pct).toLocaleString()} หน่วย
                          </text>
                        </g>
                      );
                    })}

                    {/* Plot Elements (Lines & Areas) */}
                    {(() => {
                      const dataPoints = [...trendsData].reverse(); // Order Chronologically
                      const pointsCount = dataPoints.length;
                      const stepX = (chartW - paddingX * 2) / Math.max(1, pointsCount - 1);

                      // Build coordinates
                      const elecPoints = dataPoints.map((d, i) => ({
                        x: paddingX + i * stepX,
                        y: paddingY + (chartH - paddingY * 2) * (1 - d.electricity_units / maxTrendUnits),
                        val: d.electricity_units,
                        month: d.month
                      }));

                      const waterPoints = dataPoints.map((d, i) => ({
                        x: paddingX + i * stepX,
                        y: paddingY + (chartH - paddingY * 2) * (1 - d.water_units / maxTrendUnits),
                        val: d.water_units,
                        month: d.month
                      }));

                      // Construct Path Strings
                      const elecPathStr = elecPoints.map((p) => `${p.x},${p.y}`).join(" ");
                      const waterPathStr = waterPoints.map((p) => `${p.x},${p.y}`).join(" ");

                      // Construct Filled Area Path Strings
                      const elecAreaStr = `${paddingX},${chartH - paddingY} ${elecPathStr} ${paddingX + (pointsCount - 1) * stepX},${chartH - paddingY}`;
                      const waterAreaStr = `${paddingX},${chartH - paddingY} ${waterPathStr} ${paddingX + (pointsCount - 1) * stepX},${chartH - paddingY}`;

                      return (
                        <g>
                          {/* Electricity Area */}
                          <polygon points={elecAreaStr} fill="url(#chartElecGrad)" />
                          {/* Water Area */}
                          <polygon points={waterAreaStr} fill="url(#chartWaterGrad)" />

                          {/* X-Axis labels & Grid lines */}
                          {elecPoints.map((p, i) => (
                            <g key={i}>
                              <line
                                x1={p.x}
                                y1={paddingY}
                                x2={p.x}
                                y2={chartH - paddingY}
                                stroke="#f8fafc"
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                              <text
                                x={p.x}
                                y={chartH - paddingY + 20}
                                textAnchor="middle"
                                fontSize="9.5"
                                fill="#64748b"
                                fontWeight="bold"
                              >
                                {formatMonthThaiShort(p.month)}
                              </text>
                            </g>
                          ))}

                          {/* Electricity line */}
                          <polyline
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#elecGlow)"
                            points={elecPathStr}
                          />

                          {/* Water line */}
                          <polyline
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#waterGlow)"
                            points={waterPathStr}
                          />

                          {/* Interactive data dots */}
                          {elecPoints.map((p, i) => (
                            <circle
                              key={`elec-dot-${i}`}
                              cx={p.x}
                              cy={p.y}
                              r="6"
                              fill="#ffffff"
                              stroke="#f59e0b"
                              strokeWidth="3.5"
                              className="transition duration-150"
                            />
                          ))}

                          {/* Water data dots */}
                          {waterPoints.map((p, i) => (
                            <circle
                              key={`water-dot-${i}`}
                              cx={p.x}
                              cy={p.y}
                              r="6"
                              fill="#ffffff"
                              stroke="#0ea5e9"
                              strokeWidth="3.5"
                              className="transition duration-150"
                            />
                          ))}

                          {/* Large Interactive Hover Capture Boxes */}
                          {elecPoints.map((p, i) => {
                            const capW = (i === 0 || i === pointsCount - 1) ? stepX / 2 : stepX;
                            return (
                              <rect
                                key={`capture-${i}`}
                                x={p.x - capW / 2}
                                y={paddingY}
                                width={capW}
                                height={chartH - paddingY * 2}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTrendTooltip({
                                    month: formatMonthThai(p.month),
                                    electricity: p.val,
                                    water: waterPoints[i].val,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 8
                                  });
                                }}
                                onMouseLeave={() => setTrendTooltip(null)}
                              />
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>

                  {/* Floating Glassmorphic Tooltip Card */}
                  {trendTooltip && (
                    <div 
                      className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-white/95 backdrop-blur-md border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl p-4 min-w-[210px] transition-all duration-120 ease-out"
                      style={{ left: trendTooltip.x, top: trendTooltip.y }}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        <span>🗓️ รอบบิล:</span> {trendTooltip.month}
                      </div>
                      <div className="space-y-1.5 text-xs font-bold">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block shadow-[0_1.5px_4px_rgba(245,158,11,0.35)]"></span>
                            ไฟฟ้าที่ใช้:
                          </span>
                          <span className="text-amber-600 font-extrabold text-right">
                            {trendTooltip.electricity.toLocaleString("th-TH", { maximumFractionDigits: 1 })} หน่วย
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400 inline-block shadow-[0_1.5px_4px_rgba(14,165,233,0.35)]"></span>
                            ประปาที่ใช้:
                          </span>
                          <span className="text-sky-600 font-extrabold text-right">
                            {trendTooltip.water.toLocaleString("th-TH", { maximumFractionDigits: 1 })} หน่วย
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-8 mt-2 text-xs font-black text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-1 bg-amber-500 rounded inline-block"></span>
                    ⚡ อัตราไฟฟ้าที่ใช้รวมสะสม (หน่วย)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-1 bg-sky-500 rounded inline-block"></span>
                    💧 อัตราประปาที่ใช้รวมสะสม (หน่วย)
                  </span>
                </div>
              </div>

              {/* History Table Data */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    ตารางรายละเอียดข้อมูลสรุปหน่วยน้ำไฟ ย้อนหลังรายเดือนภาพรวมสะสม
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-6">รอบบิลเดือน</th>
                        <th className="py-3 px-6 text-right bg-amber-50/20 text-amber-800">⚡ รวมพลังงานไฟฟ้า (หน่วย)</th>
                        <th className="py-3 px-6 text-right bg-amber-50/40 text-amber-800">⚡ รวมเงินไฟฟ้า (บาท)</th>
                        <th className="py-3 px-6 text-right bg-sky-50/20 text-sky-800">💧 รวมปริมาณประปา (หน่วย)</th>
                        <th className="py-3 px-6 text-right bg-sky-50/40 text-sky-800">💧 รวมเงินประปา (บาท)</th>
                        <th className="py-3 px-6 text-right font-black">รวมเงินน้ำไฟสุทธิ (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {trendsData.map((d) => (
                        <tr key={d.month} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-6 font-extrabold text-slate-800">
                            {formatMonthThai(d.month)}
                          </td>
                          <td className="py-3.5 px-6 text-right bg-amber-50/10 font-bold">
                            {d.electricity_units.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                          <td className="py-3.5 px-6 text-right bg-amber-50/20 font-extrabold text-amber-900">
                            {formatMoney(d.electricity_cost)} ฿
                          </td>
                          <td className="py-3.5 px-6 text-right bg-sky-50/10 font-bold">
                            {d.water_units.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                          <td className="py-3.5 px-6 text-right bg-sky-50/20 font-extrabold text-sky-900">
                            {formatMoney(d.water_cost)} ฿
                          </td>
                          <td className="py-3.5 px-6 text-right font-black text-[13px] text-slate-900">
                            {formatMoney(d.electricity_cost + d.water_cost)} ฿
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* QUICK EDIT DRAWER COMPONENT (SLIDE-OVER FROM RIGHT PANEL) */}
      {/* ========================================================= */}
      {isDrawerOpen && editingRoom && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Overlay background */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          ></div>

          {/* Drawer body */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-[slideInRight_0.35s_ease-out]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[9px] font-black tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase">
                  Quick Editor / บันทึกข้อมูลด่วน
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-1">
                  ห้องพัก {editingRoom.number} ({DORM_NAMES[editingRoom.dorm_key as DormType]}) — รอบบิล {formatMonthThaiShort(selectedMonth)}
                </h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSaveRoom} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Toast success alert inside form */}
              {saveSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold animate-[pulse_1.5s_infinite]">
                  🟢 {saveSuccess}
                </div>
              )}

              {/* Occupancy and Move-out Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    สถานะของห้องพัก
                  </label>
                  <select
                    value={formVacant}
                    onChange={(e) => setFormVacant(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">มีผู้เช่าพักอาศัย</option>
                    <option value="ว่าง">ห้องว่าง (ไม่มีผู้เช่า)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    แจ้งย้ายออก (หมายเหตุ)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น สิ้นเดือนนี้ / ว่าง"
                    value={formMoveOut}
                    onChange={(e) => setFormMoveOut(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Room Rent rate (Green backgrounded field) */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl space-y-2">
                <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                  💵 อัตราค่าเช่าห้องพัก (Rent Rate)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formRate || ""}
                    onChange={(e) => setFormRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-950 font-black text-sm focus:ring-2 focus:ring-emerald-500 text-right pr-10"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">
                    บาท
                  </span>
                </div>
              </div>

              {/* Electricity System (Amber backgrounded) */}
              <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    ⚡ ระบบไฟฟ้า (Electricity — หน่วยละ 7 บาท)
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-full">
                    ใช้ไป {liveElecUnits.toFixed(1)} หน่วย
                  </span>
                </div>
                
                {/* Meter comparisons */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-amber-700/80 uppercase tracking-wide mb-1.5">
                      เลขมิเตอร์ครั้งก่อน
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formElecPrev || ""}
                      onChange={(e) => setFormElecPrev(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-amber-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-amber-700/80 uppercase tracking-wide mb-1.5">
                      เลขมิเตอร์ครั้งนี้
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formElecCurr || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormElecCurr(val);
                      }}
                      className={`w-full px-3 py-2 bg-white border rounded-xl font-bold text-xs focus:ring-2 focus:ring-amber-500 text-right ${
                        formElecCurr < formElecPrev
                          ? "border-red-400 text-red-700 bg-red-50/30"
                          : "border-amber-200"
                      }`}
                    />
                  </div>
                </div>

                {/* Validation alert message */}
                {formElecCurr < formElecPrev && (
                  <p className="text-[9px] font-bold text-red-600 animate-pulse">
                    ⚠️ เลขมิเตอร์ครั้งนี้มีค่าน้อยกว่าครั้งก่อน กรุณาตรวจสอบตัวเลข
                  </p>
                )}

                <div className="pt-2 border-t border-amber-100 flex justify-between items-baseline">
                  <span className="text-[10px] text-amber-700 font-bold">รวมค่ากระแสไฟฟ้า:</span>
                  <span className="text-base font-black text-amber-950">{formatMoney(liveElecCost)} ฿</span>
                </div>
              </div>

              {/* Water System (Sky Blue Backgrounded) */}
              <div className="p-4 bg-sky-50/40 border border-sky-100 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-sky-800 uppercase tracking-wider flex items-center gap-1">
                    💧 ระบบน้ำประปา (Water — หน่วยละ 17 บาท)
                  </span>
                  <span className="text-[10px] font-bold text-sky-600 bg-sky-100/60 px-2 py-0.5 rounded-full">
                    ใช้ไป {liveWaterUnits.toFixed(1)} หน่วย
                  </span>
                </div>

                {/* Meter comparisons */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-sky-700/80 uppercase tracking-wide mb-1.5">
                      เลขมิเตอร์ครั้งก่อน
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formWaterPrev || ""}
                      onChange={(e) => setFormWaterPrev(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-sky-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-sky-700/80 uppercase tracking-wide mb-1.5">
                      เลขมิเตอร์ครั้งนี้
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formWaterCurr || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormWaterCurr(val);
                      }}
                      className={`w-full px-3 py-2 bg-white border rounded-xl font-bold text-xs focus:ring-2 focus:ring-sky-500 text-right ${
                        formWaterCurr < formWaterPrev
                          ? "border-red-400 text-red-700 bg-red-50/30"
                          : "border-sky-200"
                      }`}
                    />
                  </div>
                </div>

                {/* Validation alert message */}
                {formWaterCurr < formWaterPrev && (
                  <p className="text-[9px] font-bold text-red-600 animate-pulse">
                    ⚠️ เลขมิเตอร์ครั้งนี้มีค่าน้อยกว่าครั้งก่อน กรุณาตรวจสอบตัวเลข
                  </p>
                )}

                <div className="pt-2 border-t border-sky-100 flex justify-between items-baseline">
                  <span className="text-[10px] text-sky-700 font-bold">รวมค่าประปา:</span>
                  <span className="text-base font-black text-sky-950">{formatMoney(liveWaterCost)} ฿</span>
                </div>
              </div>

              {/* Cleaning fee & Other Fee (Purple) */}
              <div className="p-4 bg-purple-50/30 border border-purple-100 rounded-2xl space-y-4">
                <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider block">
                  🧹 บริการทำความสะอาด & ค่าบริการเสริม
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-purple-700 uppercase tracking-wide mb-1">
                      ค่าบริการทำความสะอาด
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formCleaning || ""}
                      onChange={(e) => setFormCleaning(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-purple-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-purple-700 uppercase tracking-wide mb-1">
                      ค่าบริการอื่นๆ เพิ่มเติม
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formOther || ""}
                      onChange={(e) => setFormOther(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-purple-500 text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Status and Remarks */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    สถานะการชำระเงินของบิล
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormStatus("unpaid")}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-black tracking-wide transition flex items-center justify-center gap-1.5 ${
                        formStatus !== "paid"
                          ? "bg-amber-50 border-amber-300 text-amber-700 font-extrabold shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <span>⏳</span> ค้างชำระ
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus("paid")}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-black tracking-wide transition flex items-center justify-center gap-1.5 ${
                        formStatus === "paid"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <span>✅</span> ชำระเงินแล้ว
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    บันทึกหมายเหตุเพิ่มเติม (Remarks)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ใส่ข้อมูลบันทึกเตือนความจำ..."
                    value={formRemark}
                    onChange={(e) => setFormRemark(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  ></textarea>
                </div>
              </div>
            </form>

            {/* Footer buttons */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  ยอดประเมินรวมใบแจ้งหนี้:
                </span>
                <div className="text-xl font-black text-rose-600 tracking-tight">
                  {formatMoney(liveTotal)} ฿
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoom}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-lg shadow-teal-600/10 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <span>💾</span> บันทึกข้อมูล
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
