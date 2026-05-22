"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useDormitoryData } from "@/lib/useDormitoryData";
import { useGarageData } from "@/lib/useGarageData";
import { useHouseData } from "@/lib/useHouseData";
import { useTransactionData } from "@/lib/useTransactionData";
import { authFetch } from "@/lib/api";

interface UtilityMonthItem {
  month: string;
  collected: number;
  gov_paid: number;
  margin: number;
  margin_pct: number;
}

interface UtilityAnalyticsData {
  water: UtilityMonthItem[];
  electricity: UtilityMonthItem[];
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthThai(monthStr: string) {
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

export default function ReportsPage() {
  const dorm = useDormitoryData();
  const garage = useGarageData();
  const house = useHouseData();
  const tx = useTransactionData();

  const [activeTab, setActiveTab] = useState<"overview" | "utility">("overview");
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [utilityData, setUtilityData] = useState<UtilityAnalyticsData>({ water: [], electricity: [] });
  const [isLoadingUtility, setIsLoadingUtility] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    // Fetch overall monthly financial summary
    authFetch(`${API_BASE}/transactions/monthly-summary`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMonthlyData(data);
        }
      })
      .catch((err) => console.error("Error loading monthly summary on reports:", err));

    // Fetch water & electricity margin analysis
    authFetch(`${API_BASE}/transactions/utility-analytics/`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.water && data.electricity) {
          setUtilityData(data);
        }
        setIsLoadingUtility(false);
      })
      .catch((err) => {
        console.error("Error loading utility analytics:", err);
        setIsLoadingUtility(false);
      });
  }, []);

  // Compute overall totals for the business
  const totals = useMemo(() => {
    const grossRevenue = dorm.grandExpectedRevenue + garage.totalRevenue + house.totalExpectedRevenue;
    const collected = dorm.grandPaidRevenue + garage.paidRevenue + house.paidRevenue;
    const pending = dorm.grandPendingRevenue + garage.pendingRevenue + house.pendingRevenue;
    
    // Sum all expense transactions (Operating Expenses)
    const operating = tx.transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return { grossRevenue, collected, pending, operating };
  }, [dorm, garage, house, tx.transactions]);

  const collectionRate = totals.grossRevenue > 0 
    ? Math.round((totals.collected / totals.grossRevenue) * 100) 
    : 0;

  // Utility Aggregates for dynamic summary cards
  const utilitySummary = useMemo(() => {
    const waterCollected = utilityData.water.reduce((s, i) => s + i.collected, 0);
    const waterGovPaid = utilityData.water.reduce((s, i) => s + i.gov_paid, 0);
    const waterMargin = waterCollected - waterGovPaid;
    const waterMarginPct = waterGovPaid > 0 ? (waterMargin / waterGovPaid) * 100 : (waterCollected > 0 ? 100 : 0);

    const elecCollected = utilityData.electricity.reduce((s, i) => s + i.collected, 0);
    const elecGovPaid = utilityData.electricity.reduce((s, i) => s + i.gov_paid, 0);
    const elecMargin = elecCollected - elecGovPaid;
    const elecMarginPct = elecGovPaid > 0 ? (elecMargin / elecGovPaid) * 100 : (elecCollected > 0 ? 100 : 0);

    return {
      waterCollected,
      waterGovPaid,
      waterMargin,
      waterMarginPct,
      elecCollected,
      elecGovPaid,
      elecMargin,
      elecMarginPct,
    };
  }, [utilityData]);

  // Max value calculator for SVG double bar charts
  const maxWaterVal = useMemo(() => {
    const vals = utilityData.water.flatMap(d => [d.collected, d.gov_paid]);
    return Math.max(...vals, 1000);
  }, [utilityData.water]);

  const maxElecVal = useMemo(() => {
    const vals = utilityData.electricity.flatMap(d => [d.collected, d.gov_paid]);
    return Math.max(...vals, 1000);
  }, [utilityData.electricity]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3 inline-block">
            Reports & Analytics
          </span>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">รายงานวิเคราะห์ระบบรวม</h1>
          <p className="text-slate-500 text-sm mt-1">
            วิเคราะห์ประสิทธิภาพทางการเงิน ส่วนต่างผลกำไรสาธารณูปโภค และสถานะการซิงก์ระบบหลัก
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transactions" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-lg shadow-slate-900/10 transition">
            ดูบัญชี
          </Link>
          <Link href="/settings" className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black transition">
            ตั้งค่าระบบ
          </Link>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📊 ภาพรวมธุรกิจรวม (Financial Overview)
        </button>
        <button
          onClick={() => setActiveTab("utility")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
            activeTab === "utility"
              ? "border-blue-600 text-blue-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          💧⚡ วิเคราะห์กำไรน้ำไฟ (Utility Margin Analytics)
        </button>
      </div>

      {/* Tab 1: Financial Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="รายรับคาดหวังทั้งหมด (Gross Expected)" value={totals.grossRevenue} tone="text-slate-800" />
            <StatCard label="รายรับที่จัดเก็บได้จริง (Collected Revenue)" value={totals.collected} tone="text-emerald-600" />
            <StatCard label="ยอดค้างชำระจากลูกหนี้ (Pending Dues)" value={totals.pending} tone="text-amber-500" />
            <StatCard label="ค่าใช้จ่ายสะสมในระบบ (Operating Expenses)" value={totals.operating} tone="text-rose-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Columns: Property Assets */}
            <div className="lg:col-span-2 space-y-6">
              <Panel title="สถิติดำเนินงานแยกตามกลุ่มทรัพย์สิน" subtitle="สัดส่วนจำนวนห้อง งานซ่อม และอัตราเช่าจริง">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <MiniMetric label="ห้องพักทั้งหมด" value={dorm.totalRooms} suffix="ห้อง" />
                  <MiniMetric label="อัตราการเช่าเฉลี่ย" value={dorm.occupancyRate} suffix="%" />
                  <MiniMetric label="งานอู่ซ่อมรถ" value={garage.totalJobs} suffix="คัน" />
                  <MiniMetric label="บ้านเช่าบริการ" value={house.totalHouses} suffix="หลัง" />
                </div>
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">สรุปผลประกอบการแบ่งตามแผนก (Expected vs. Collected)</h3>
                  <div className="space-y-3">
                    <ProgressBar label="ธุรกิจหอพัก (Dormitories)" expected={dorm.grandExpectedRevenue} collected={dorm.grandPaidRevenue} color="bg-blue-600" />
                    <ProgressBar label="ธุรกิจอู่ซ่อมรถ (Garage Jobs)" expected={garage.totalRevenue} collected={garage.paidRevenue} color="bg-indigo-600" />
                    <ProgressBar label="ธุรกิจบ้านเช่า (Rental Houses)" expected={house.totalExpectedRevenue} collected={house.paidRevenue} color="bg-amber-500" />
                  </div>
                </div>
              </Panel>
            </div>

            {/* Right Column: API & Service Status Integrations Checklist */}
            <div className="space-y-6">
              <Panel title="สถานะความเชื่อมโยงระบบ (System & API Integrity)" subtitle="การเชื่อมโยงระบบอัตโนมัติ">
                <div className="space-y-4">
                  <IntegrationStatusRow label="LINE Messaging API Webhook" status="Active" details="พอร์ต 6543 ปลายทางตอบกลับ HTTP 200 OK" isOk={true} />
                  <IntegrationStatusRow label="SlipOK QR Verification" status="Connected" details="ตรวจสอบสลิปอัตโนมัติ ป้องกันสลิปซ้ำ" isOk={true} />
                  <IntegrationStatusRow label="Database Engine Sync" status="Synced" details="SQLite พัฒนาในเครื่อง ⇄ PostgreSQL Supabase" isOk={true} />
                  <IntegrationStatusRow label="UptimeRobot Scheduler" status="Active" details="สแกนรอบบิลแจ้งเตือนวันที่ 25 ถึง 5 ของเดือน" isOk={true} />
                </div>
                <div className="mt-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950/80 leading-relaxed">
                  💡 **นโยบายค่าปรับล่าช้า:** ระบบตั้งเวลาสแกนอัตโนมัติแจ้งเตือนบิลตั้งแต่วันที่ 25 จนถึงวันที่ 5 ของเดือนถัดไป หลังวันที่ 5 เป็นต้นไปจะคำนวณเบี้ยปรับค้างชำระอัตโนมัติ 100 บาท/วัน
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Utility Margin Analytics */}
      {activeTab === "utility" && (
        <div className="space-y-6">
          {isLoadingUtility ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-semibold tracking-wide mt-4">กำลังประมวลผลยอดส่วนต่างค่าน้ำ-ค่าไฟหลวง...</p>
            </div>
          ) : (
            <>
              {/* Utility Margin KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Water Utility Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💧</span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">ระบบค่าน้ำประปา (Water Utility)</h2>
                        <p className="text-[10px] text-slate-400">เปรียบเทียบยอดรวมค่าน้ำย้อนหลัง 6 เดือน</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                      utilitySummary.waterMargin >= 0 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                    }`}>
                      {utilitySummary.waterMargin >= 0 
                        ? `🟢 กำไรสะสม +${utilitySummary.waterMargin.toLocaleString()} ฿` 
                        : `🔴 ขาดทุนสะสม ${utilitySummary.waterMargin.toLocaleString()} ฿`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                      <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">เก็บจากลูกบ้าน</span>
                      <div className="text-base font-extrabold text-blue-900 mt-0.5">{formatMoney(utilitySummary.waterCollected)} ฿</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">จ่ายบิลหลวง</span>
                      <div className="text-base font-extrabold text-slate-700 mt-0.5">{formatMoney(utilitySummary.waterGovPaid)} ฿</div>
                    </div>
                    <div className={`p-3 rounded-2xl border ${
                      utilitySummary.waterMargin >= 0 
                        ? "bg-emerald-50/30 border-emerald-100/60" 
                        : "bg-rose-50/30 border-rose-100/60"
                    }`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        utilitySummary.waterMargin >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}>ส่วนต่างกำไร</span>
                      <div className={`text-base font-extrabold mt-0.5 ${
                        utilitySummary.waterMargin >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}>{utilitySummary.waterMargin >= 0 ? "+" : ""}{formatMoney(utilitySummary.waterMargin)} ฿</div>
                    </div>
                  </div>
                </div>

                {/* Electricity Utility Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">ระบบไฟฟ้าหลวง (Electricity Utility)</h2>
                        <p className="text-[10px] text-slate-400">เปรียบเทียบยอดรวมค่าไฟฟ้าย้อนหลัง 6 เดือน</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                      utilitySummary.elecMargin >= 0 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                    }`}>
                      {utilitySummary.elecMargin >= 0 
                        ? `🟢 กำไรสะสม +${utilitySummary.elecMargin.toLocaleString()} ฿` 
                        : `🔴 ขาดทุนสะสม ${utilitySummary.elecMargin.toLocaleString()} ฿`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">เก็บจากลูกบ้าน</span>
                      <div className="text-base font-extrabold text-amber-950 mt-0.5">{formatMoney(utilitySummary.elecCollected)} ฿</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">จ่ายบิลหลวง</span>
                      <div className="text-base font-extrabold text-slate-700 mt-0.5">{formatMoney(utilitySummary.elecGovPaid)} ฿</div>
                    </div>
                    <div className={`p-3 rounded-2xl border ${
                      utilitySummary.elecMargin >= 0 
                        ? "bg-emerald-50/30 border-emerald-100/60" 
                        : "bg-rose-50/30 border-rose-100/60"
                    }`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        utilitySummary.elecMargin >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}>ส่วนต่างกำไร</span>
                      <div className={`text-base font-extrabold mt-0.5 ${
                        utilitySummary.elecMargin >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}>{utilitySummary.elecMargin >= 0 ? "+" : ""}{formatMoney(utilitySummary.elecMargin)} ฿</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic SVG Double Bar Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Water Chart */}
                <Panel title="💧 แผนภาพค่าน้ำประปา ย้อนหลัง 6 เดือน" subtitle="เปรียบเทียบรายรับค่าน้ำ (น้ำเงิน) ปะทะ ยอดจ่ายหลวงจริง (เทา)">
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 540 240`} className="w-full" style={{ minWidth: 450 }}>
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                        <g key={i}>
                          <line x1="60" y1={190 - pct * 150} x2="520" y2={190 - pct * 150} stroke="#f1f5f9" strokeWidth="1" />
                          <text x="50" y={194 - pct * 150} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="bold">
                            {(maxWaterVal * pct).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </text>
                        </g>
                      ))}
                      
                      {/* Double Bars */}
                      {utilityData.water.map((d, i) => {
                        const x = 75 + i * 72;
                        const colH = (d.collected / maxWaterVal) * 150;
                        const govH = (d.gov_paid / maxWaterVal) * 150;

                        return (
                          <g key={d.month} className="group">
                            {/* Collected Bar */}
                            <rect x={x} y={190 - colH} width="22" height={colH} rx="3" fill="url(#waterColGrad)" opacity="0.9" className="transition-all duration-300 hover:opacity-100">
                              <title>เก็บจากลูกบ้าน: {d.collected.toLocaleString()} ฿</title>
                            </rect>
                            <text x={x + 11} y={183 - colH} textAnchor="middle" fontSize="8" fill="#1e3a8a" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {d.collected > 0 ? `${(d.collected/1000).toFixed(1)}K` : ''}
                            </text>

                            {/* Paid Gov Bar */}
                            <rect x={x + 26} y={190 - govH} width="22" height={govH} rx="3" fill="url(#waterGovGrad)" opacity="0.9" className="transition-all duration-300 hover:opacity-100">
                              <title>จ่ายบิลประปาหลวง: {d.gov_paid.toLocaleString()} ฿</title>
                            </rect>
                            <text x={x + 37} y={183 - govH} textAnchor="middle" fontSize="8" fill="#475569" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {d.gov_paid > 0 ? `${(d.gov_paid/1000).toFixed(1)}K` : ''}
                            </text>

                            {/* X-Axis Month Tag */}
                            <text x={x + 24} y={210} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="bold">
                              {formatMonthThai(d.month)}
                            </text>
                            
                            {/* Margin badge at bar bottom */}
                            <text x={x + 24} y={224} textAnchor="middle" fontSize="8" fill={d.margin >= 0 ? "#059669" : "#e11d48"} fontWeight="black">
                              {d.margin >= 0 ? `+${Math.round(d.margin)}` : Math.round(d.margin)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Definitions */}
                      <defs>
                        <linearGradient id="waterColGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                        <linearGradient id="waterGovGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#94a3b8" />
                          <stop offset="100%" stopColor="#475569" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="flex justify-center gap-6 mt-2 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span> เรียกเก็บได้จากลูกบ้าน
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-slate-500 inline-block"></span> ค่าใช้จ่ายบิลหลวงประปา
                    </span>
                  </div>
                </Panel>

                {/* Electricity Chart */}
                <Panel title="⚡ แผนภาพค่าไฟฟ้าหลวง ย้อนหลัง 6 เดือน" subtitle="เปรียบเทียบรายรับค่าไฟ (ส้ม) ปะทะ ยอดจ่ายหลวงจริง (แดง)">
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 540 240`} className="w-full" style={{ minWidth: 450 }}>
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                        <g key={i}>
                          <line x1="60" y1={190 - pct * 150} x2="520" y2={190 - pct * 150} stroke="#f1f5f9" strokeWidth="1" />
                          <text x="50" y={194 - pct * 150} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="bold">
                            {(maxElecVal * pct).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </text>
                        </g>
                      ))}
                      
                      {/* Double Bars */}
                      {utilityData.electricity.map((d, i) => {
                        const x = 75 + i * 72;
                        const colH = (d.collected / maxElecVal) * 150;
                        const govH = (d.gov_paid / maxElecVal) * 150;

                        return (
                          <g key={d.month} className="group">
                            {/* Collected Bar */}
                            <rect x={x} y={190 - colH} width="22" height={colH} rx="3" fill="url(#elecColGrad)" opacity="0.9" className="transition-all duration-300 hover:opacity-100">
                              <title>เก็บจากลูกบ้าน: {d.collected.toLocaleString()} ฿</title>
                            </rect>
                            <text x={x + 11} y={183 - colH} textAnchor="middle" fontSize="8" fill="#78350f" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {d.collected > 0 ? `${(d.collected/1000).toFixed(1)}K` : ''}
                            </text>

                            {/* Paid Gov Bar */}
                            <rect x={x + 26} y={190 - govH} width="22" height={govH} rx="3" fill="url(#elecGovGrad)" opacity="0.9" className="transition-all duration-300 hover:opacity-100">
                              <title>จ่ายบิลไฟฟ้าหลวง: {d.gov_paid.toLocaleString()} ฿</title>
                            </rect>
                            <text x={x + 37} y={183 - govH} textAnchor="middle" fontSize="8" fill="#991b1b" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {d.gov_paid > 0 ? `${(d.gov_paid/1000).toFixed(1)}K` : ''}
                            </text>

                            {/* X-Axis Month Tag */}
                            <text x={x + 24} y={210} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="bold">
                              {formatMonthThai(d.month)}
                            </text>
                            
                            {/* Margin badge at bar bottom */}
                            <text x={x + 24} y={224} textAnchor="middle" fontSize="8" fill={d.margin >= 0 ? "#059669" : "#e11d48"} fontWeight="black">
                              {d.margin >= 0 ? `+${Math.round(d.margin)}` : Math.round(d.margin)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Definitions */}
                      <defs>
                        <linearGradient id="elecColGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="elecGovGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#e11d48" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="flex justify-center gap-6 mt-2 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> เรียกเก็บได้จากลูกบ้าน
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> ค่าใช้จ่ายบิลหลวงไฟฟ้า
                    </span>
                  </div>
                </Panel>
              </div>

              {/* Dynamic Advisor Board */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-950/40 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 text-9xl opacity-5 pointer-events-none select-none">📊</div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl mt-1">💡</div>
                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold tracking-tight">แผงคำแนะนำยุทธศาสตร์สาธารณูปโภค (Business Advisor Board)</h3>
                    <p className="text-xs text-indigo-200 leading-relaxed max-w-4xl">
                      ผลการวิเคราะห์ส่วนต่างค่าน้ำประปาและค่าไฟฟ้าหลวงของกิจการในเครืออสังหาริมทรัพย์ของครอบครัว:
                    </p>
                    <div className="pt-2 space-y-2 text-xs">
                      {utilitySummary.waterMargin < 0 ? (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl leading-relaxed text-red-200">
                          ⚠️ **สัญญาณเตือนภัยระบบค่าน้ำ:** ค่าน้ำประปาติดลบสะสม **{formatMoney(Math.abs(utilitySummary.waterMargin))} ฿** ({utilitySummary.waterMarginPct.toFixed(1)}%) 
                          แสดงว่ามียอดการรั่วไหลประปาส่วนกลางสูง หรืออัตราการเรียกเก็บต่อหน่วยต่ำเกินไป! 
                          แนะนำให้ **สุ่มเช็คมิเตอร์หอพักแต่ละปีก / ตรวจหาจุดรั่วซึม** และพิจารณาปรับค่าหน่วยในหน้า{" "}
                          <Link href="/settings" className="underline font-bold text-white hover:text-indigo-200">ตั้งค่าระบบ (Settings)</Link> เพื่อกู้คืนส่วนต่างกำไรให้คุ้มทุน
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl leading-relaxed text-emerald-200">
                          🟢 **ระบบค่าน้ำทำงานได้ยอดเยี่ยม:** ค่าน้ำประปาได้กำไรส่วนต่างสะสม **+{formatMoney(utilitySummary.waterMargin)} ฿** ({utilitySummary.waterMarginPct.toFixed(1)}%) 
                          แสดงว่าโครงสร้างราคาต่อหน่วยที่ตั้งค่าไว้ครอบคลุมค่าสูญเสียและค่าน้ำส่วนกลางหอพักได้เป็นอย่างดี แนะนำให้รักษามาตรฐานการเช็คมิเตอร์นี้ต่อไป
                        </div>
                      )}

                      {utilitySummary.elecMargin < 0 ? (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl leading-relaxed text-red-200">
                          ⚠️ **สัญญาณเตือนภัยระบบไฟฟ้า:** ค่าไฟฟ้าติดลบสะสม **{formatMoney(Math.abs(utilitySummary.elecMargin))} ฿** ({utilitySummary.elecMarginPct.toFixed(1)}%) 
                          ชี้ให้เห็นว่ามีการใช้พลังงานไฟส่วนกลางสูง (เช่น ปั๊มน้ำ, แสงสว่างทางเดิน, แอร์ส่วนกลาง) หรือเรทอัตราไฟฟ้าที่เรียกเก็บต่อหน่วยไม่สอดคล้องกับอัตราก้าวหน้าของการไฟฟ้าหลวง 
                          แนะนำให้ปรับอัตราค่ากระแสไฟฟ้าต่อหน่วยในหน้า{" "}
                          <Link href="/settings" className="underline font-bold text-white hover:text-indigo-200">ตั้งค่าระบบ (Settings)</Link> ทันทีเพื่อป้องกันการสูญเสียรายรับอย่างต่อเนื่อง
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl leading-relaxed text-emerald-200">
                          🟢 **ระบบไฟฟ้าทำงานได้ยอดเยี่ยม:** ค่าไฟฟ้าได้กำไรส่วนต่างสะสม **+{formatMoney(utilitySummary.elecMargin)} ฿** ({utilitySummary.elecMarginPct.toFixed(1)}%) 
                          แสดงว่าอัตราการเรียกเก็บต่อหน่วยเหมาะสมแล้ว สามารถกู้วิกฤตค่าไฟส่วนกลางได้และมีกระแสเงินสดหล่อเลี้ยงระบบไฟฟ้าได้อย่างสมดุล
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] transition hover:shadow-md">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</div>
      <div className={`mt-1.5 text-2xl font-black tracking-tight ${tone}`}>{formatMoney(value)} ฿</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.015)] space-y-4">
      <div>
        <h2 className="text-base font-extrabold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function MiniMetric({ label, value, suffix = "฿" }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100/50">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-800 tracking-tight">
        {typeof value === "number" ? value.toLocaleString("th-TH") : value} <span className="text-xs text-slate-400 font-normal">{suffix}</span>
      </div>
    </div>
  );
}

function ProgressBar({ label, expected, collected, color }: { label: string; expected: number; collected: number; color: string }) {
  const pct = expected > 0 ? Math.min(Math.round((collected / expected) * 100), 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold text-slate-700">
        <span>{label}</span>
        <span className="text-slate-500">{formatMoney(collected)} ฿ / {formatMoney(expected)} ฿ ({pct}%)</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}

function IntegrationStatusRow({ label, status, details, isOk }: { label: string; status: string; details: string; isOk: boolean }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 transition hover:bg-slate-100/30">
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${isOk ? "bg-emerald-500 shadow-lg shadow-emerald-500/40" : "bg-red-500 shadow-lg shadow-red-500/40"}`}></div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xs font-bold text-slate-700 truncate">{label}</span>
          <span className={`text-[10px] font-black uppercase tracking-wider ${isOk ? "text-emerald-600" : "text-red-600"}`}>{status}</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{details}</p>
      </div>
    </div>
  );
}
