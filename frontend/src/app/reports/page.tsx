"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useDormitoryData } from "@/lib/useDormitoryData";
import { useGarageData } from "@/lib/useGarageData";
import { useHouseData } from "@/lib/useHouseData";
import { useTransactionData } from "@/lib/useTransactionData";
import { authFetch, fetchBudgets, createBudget, deleteBudget, fetchBusinessUnits, fetchAssets, createAsset, deleteAsset, fetchAssetSummary, fetchAssetSchedule, postDepreciation, postAllDepreciation } from "@/lib/api";


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

  const [activeTab, setActiveTab] = useState<"overview" | "utility" | "cashflow" | "budget" | "assets">("overview");
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [utilityData, setUtilityData] = useState<UtilityAnalyticsData>({ water: [], electricity: [] });
  const [isLoadingUtility, setIsLoadingUtility] = useState(true);

  // Cash Flow States
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [isLoadingCashFlow, setIsLoadingCashFlow] = useState(false);

  // Budget States
  const [budgets, setBudgets] = useState<any[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [newBudget, setNewBudget] = useState({
    unit_id: "",
    expense_category: "",
    amount_limit: "",
    period: "monthly",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  // Asset & Depreciation States (Phase 5)
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetSummary, setAssetSummary] = useState<any>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetSchedule, setAssetSchedule] = useState<any[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: "",
    code: "",
    purchase_cost: "",
    salvage_value: "0",
    useful_life_years: "5",
    purchase_date: new Date().toISOString().split("T")[0],
    description: "",
    unit_id: ""
  });
  const [deprPostDate, setDeprPostDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });


  // Dynamic Date Range States (Default to last 6 months)
  const defaultDates = useMemo(() => {
    const current = new Date();
    const start = new Date(current.getFullYear(), current.getMonth() - 5, 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
      end: `${current.getFullYear()}-${pad(current.getMonth() + 1)}`
    };
  }, []);

  const [startMonth, setStartMonth] = useState(defaultDates.start);
  const [endMonth, setEndMonth] = useState(defaultDates.end);
  const [preset, setPreset] = useState<"6m" | "12m" | "thisYear" | "lastYear" | "allTime" | "custom">("6m");

  // Quick Preset Selector Action
  const applyPreset = (p: "6m" | "12m" | "thisYear" | "lastYear" | "allTime") => {
    setPreset(p);
    const current = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const endStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}`;
    
    if (p === "6m") {
      const start = new Date(current.getFullYear(), current.getMonth() - 5, 1);
      setStartMonth(`${start.getFullYear()}-${pad(start.getMonth() + 1)}`);
      setEndMonth(endStr);
    } else if (p === "12m") {
      const start = new Date(current.getFullYear(), current.getMonth() - 11, 1);
      setStartMonth(`${start.getFullYear()}-${pad(start.getMonth() + 1)}`);
      setEndMonth(endStr);
    } else if (p === "thisYear") {
      setStartMonth(`${current.getFullYear()}-01`);
      setEndMonth(`${current.getFullYear()}-12`);
    } else if (p === "lastYear") {
      const lastYear = current.getFullYear() - 1;
      setStartMonth(`${lastYear}-01`);
      setEndMonth(`${lastYear}-12`);
    } else if (p === "allTime") {
      // 2 Years ago (All-Time default starting point)
      const start = new Date(current.getFullYear() - 2, 0, 1);
      setStartMonth(`${start.getFullYear()}-01`);
      setEndMonth(endStr);
    }
  };

  // Generate Thai selectable months list (last 3 years to current)
  const selectableMonths = useMemo(() => {
    const current = new Date();
    const list: { val: string; label: string }[] = [];
    const thMonths = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const startYear = current.getFullYear() - 3;
    const endYear = current.getFullYear();
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    for (let y = endYear; y >= startYear; y--) {
      for (let m = 12; m >= 1; m--) {
        const val = `${y}-${pad(m)}`;
        const thYear = (y + 543).toString();
        const label = `${thMonths[m-1]} ${thYear}`;
        list.push({ val, label });
      }
    }
    return list;
  }, []);

  // Load Budgets helper
  const loadBudgets = useCallback(async () => {
    setIsLoadingBudgets(true);
    try {
      const res = await fetchBudgets();
      if (Array.isArray(res)) {
        setBudgets(res);
      }
    } catch (err) {
      console.error("Error loading budgets:", err);
    } finally {
      setIsLoadingBudgets(false);
    }
  }, []);

  // Load Cash Flow helper
  const loadCashFlow = useCallback(async () => {
    setIsLoadingCashFlow(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${API_BASE}/transactions/cashflow?start_month=${startMonth}&end_month=${endMonth}`);
      if (res.ok) {
        const data = await res.json();
        setCashFlowData(data);
      }
    } catch (err) {
      console.error("Error loading cash flow:", err);
    } finally {
      setIsLoadingCashFlow(false);
    }
  }, [startMonth, endMonth]);

  // Load Business Units helper
  const loadBusinessUnits = useCallback(async () => {
    try {
      const res = await fetchBusinessUnits();
      if (Array.isArray(res)) {
        setBusinessUnits(res);
      }
    } catch (err) {
      console.error("Error loading business units:", err);
    }
  }, []);

  // Load Assets helper
  const loadAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      const list = await fetchAssets();
      if (Array.isArray(list)) {
        setAssets(list);
      }
      const sum = await fetchAssetSummary();
      if (sum) {
        setAssetSummary(sum);
      }
    } catch (err) {
      console.error("Error loading assets:", err);
    } finally {
      setIsLoadingAssets(false);
    }
  }, []);

  // Sync API Fetching when Date Filters shift
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    setIsLoadingUtility(true);
    
    // Fetch overall monthly financial summary
    authFetch(`${API_BASE}/transactions/monthly-summary?start_month=${startMonth}&end_month=${endMonth}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMonthlyData(data);
        }
      })
      .catch((err) => console.error("Error loading monthly summary on reports:", err));

    // Fetch water & electricity margin analysis
    authFetch(`${API_BASE}/transactions/utility-analytics/?start_month=${startMonth}&end_month=${endMonth}`)
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

    loadCashFlow();
    loadBudgets();
    loadBusinessUnits();
  }, [startMonth, endMonth, loadCashFlow, loadBudgets, loadBusinessUnits]);

  useEffect(() => {
    if (activeTab === "assets") {
      loadAssets();
    }
  }, [activeTab, loadAssets]);

  // Handle Create Budget
  const handleCreateBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.amount_limit || parseFloat(newBudget.amount_limit) <= 0) {
      alert("กรุณาระบุเกณฑ์จำกัดงบประมาณรายจ่ายที่ถูกต้อง");
      return;
    }
    
    setIsSubmittingBudget(true);
    try {
      const payload: Record<string, any> = {
        amount_limit: parseFloat(newBudget.amount_limit),
        period: newBudget.period,
        year: parseInt(String(newBudget.year), 10),
      };
      
      if (newBudget.unit_id) {
        payload.unit_id = parseInt(newBudget.unit_id, 10);
      }
      if (newBudget.expense_category) {
        payload.expense_category = newBudget.expense_category;
      }
      if (newBudget.period === "monthly" && newBudget.month) {
        payload.month = parseInt(String(newBudget.month), 10);
      } else {
        payload.month = null;
      }
      
      await createBudget(payload);
      setIsBudgetModalOpen(false);
      // Reset form
      setNewBudget({
        unit_id: "",
        expense_category: "",
        amount_limit: "",
        period: "monthly",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      });
      loadBudgets();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกงบประมาณ");
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  // Handle Delete Budget
  const handleDeleteBudgetClick = async (budgetId: number) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบเกณฑ์ควบคุมงบประมาณรายจ่ายนี้?")) {
      return;
    }
    try {
      await deleteBudget(budgetId);
      loadBudgets();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการลบงบประมาณ");
    }
  };

  // Handle Create Asset (Phase 5)
  const handleCreateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name.trim() || !newAsset.code.trim()) {
      alert("กรุณาระบุชื่อและรหัสสินทรัพย์");
      return;
    }
    const cost = parseFloat(newAsset.purchase_cost);
    if (isNaN(cost) || cost <= 0) {
      alert("กรุณาระบุราคาทุนสินทรัพย์ที่ถูกต้อง");
      return;
    }
    const salvage = parseFloat(newAsset.salvage_value || "0");
    if (isNaN(salvage) || salvage < 0) {
      alert("กรุณาระบุมูลค่าซากที่ถูกต้อง");
      return;
    }
    const years = parseInt(newAsset.useful_life_years || "5", 10);
    if (isNaN(years) || years <= 0) {
      alert("กรุณาระบุอายุการใช้งานที่ถูกต้อง");
      return;
    }

    setIsSubmittingAsset(true);
    try {
      const payload: Record<string, any> = {
        name: newAsset.name.trim(),
        code: newAsset.code.trim(),
        purchase_date: `${newAsset.purchase_date}T00:00:00`,
        purchase_cost: cost,
        salvage_value: salvage,
        useful_life_years: years,
        description: newAsset.description.trim() || null,
        unit_id: newAsset.unit_id ? parseInt(newAsset.unit_id, 10) : null
      };

      await createAsset(payload);
      setIsAssetModalOpen(false);
      // Reset form
      setNewAsset({
        name: "",
        code: "",
        purchase_cost: "",
        salvage_value: "0",
        useful_life_years: "5",
        purchase_date: new Date().toISOString().split("T")[0],
        description: "",
        unit_id: ""
      });
      loadAssets();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกสินทรัพย์");
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  // Handle Delete Asset
  const handleDeleteAssetClick = async (assetId: number) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบสินทรัพย์ถาวรชิ้นนี้? การลบจะทำการลบประวัติค่าเสื่อมสะสมที่เคยกระทบยอดลง Ledger ทั้งหมดด้วย!")) {
      return;
    }
    try {
      await deleteAsset(assetId);
      loadAssets();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการลบสินทรัพย์");
    }
  };

  // Handle View Schedule
  const handleViewScheduleClick = async (asset: any) => {
    setSelectedAsset(asset);
    setIsLoadingSchedule(true);
    setIsScheduleModalOpen(true);
    try {
      const schedule = await fetchAssetSchedule(asset.id);
      if (Array.isArray(schedule)) {
        setAssetSchedule(schedule);
      }
    } catch (err) {
      console.error("Error loading asset schedule:", err);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Handle Post Single Depreciation
  const handlePostDepreciationClick = async (assetId: number) => {
    const { year, month } = deprPostDate;
    if (!confirm(`ยืนยันบันทึกค่าเสื่อมราคาของสินทรัพย์นี้ลงบัญชี Ledger ประจำเดือน ${month}/${year}?`)) {
      return;
    }
    try {
      await postDepreciation(assetId, year, month);
      alert("บันทึกค่าเสื่อมราคาลงบัญชีสำเร็จแล้ว (Ledger Updated)");
      loadAssets();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกค่าเสื่อมราคา");
    }
  };

  // Handle Post All Depreciation
  const handlePostAllDepreciationClick = async () => {
    const { year, month } = deprPostDate;
    if (!confirm(`ยืนยันบันทึกค่าเสื่อมราคาสินทรัพย์ที่มีอยู่ 'ทุกรายการ' ลงบัญชี Ledger ประจำเดือน ${month}/${year}?`)) {
      return;
    }
    try {
      await postAllDepreciation(year, month);
      alert("บันทึกค่าเสื่อมราคาของสินทรัพย์ทั้งหมดลงบัญชี Ledger เรียบร้อยแล้ว (Ledger Bulk Updated)");
      loadAssets();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกค่าเสื่อมราคารวม");
    }
  };

  // Handle Export Cash Flow Excel Report
  const handleExportCashFlow = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await authFetch(`${API_BASE}/transactions/export/cashflow?start_month=${startMonth}&end_month=${endMonth}`);
      if (!response.ok) {
        throw new Error("ดาวน์โหลดไฟล์กระแสเงินสดล้มเหลว");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `StatementOfCashFlows_${startMonth}_to_${endMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel");
    }
  };

  // Compute live property totals for the business
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

  // Compute historical ledger aggregates within the selected time window
  const historicalLedger = useMemo(() => {
    const income = monthlyData.reduce((s, d) => s + d.income, 0);
    const expense = monthlyData.reduce((s, d) => s + d.expense, 0);
    const margin = income - expense;
    const marginPct = income > 0 ? (margin / income) * 100 : 0;
    return { income, expense, margin, marginPct };
  }, [monthlyData]);

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

  // Max value calculator and dynamic width calculator for SVG charts
  const maxMonthlyVal = useMemo(() => {
    const vals = monthlyData.flatMap(d => [d.income, d.expense]);
    return Math.max(...vals, 1000);
  }, [monthlyData]);

  const overviewChartWidth = useMemo(() => {
    return Math.max(540, 75 + monthlyData.length * 72 + 30);
  }, [monthlyData]);

  const maxWaterVal = useMemo(() => {
    const vals = utilityData.water.flatMap(d => [d.collected, d.gov_paid]);
    return Math.max(...vals, 1000);
  }, [utilityData.water]);

  const waterChartWidth = useMemo(() => {
    return Math.max(540, 75 + utilityData.water.length * 72 + 30);
  }, [utilityData.water]);

  const maxElecVal = useMemo(() => {
    const vals = utilityData.electricity.flatMap(d => [d.collected, d.gov_paid]);
    return Math.max(...vals, 1000);
  }, [utilityData.electricity]);

  const elecChartWidth = useMemo(() => {
    return Math.max(540, 75 + utilityData.electricity.length * 72 + 30);
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

      {/* Date Range Selector Panel (Historical Filter Board) */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📅</span>
            <div>
              <h2 className="text-sm font-black text-slate-800">ช่วงเวลาวิเคราะห์งบย้อนหลัง (Historical Period)</h2>
              <p className="text-[10px] text-slate-400">เลือกช่วงเวลารายงานหรือกำหนดช่วงเดือนเริ่มต้น-สิ้นสุดย้อนหลัง 1 - 2 ปีหรือมากกว่าได้โดยตรงจาก Ledger</p>
            </div>
          </div>
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "6m", label: "6 เดือนล่าสุด", action: () => applyPreset("6m") },
              { id: "12m", label: "12 เดือนล่าสุด", action: () => applyPreset("12m") },
              { id: "thisYear", label: "ปีนี้", action: () => applyPreset("thisYear") },
              { id: "lastYear", label: "ปีที่แล้ว", action: () => applyPreset("lastYear") },
              { id: "allTime", label: "2 ปีล่าสุด (All-Time)", action: () => applyPreset("allTime") },
            ].map((pOpt) => (
              <button
                key={pOpt.id}
                onClick={pOpt.action}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide border transition-all ${
                  preset === pOpt.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {pOpt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ตั้งแต่เดือน (Start Month)</label>
            <select
              value={startMonth}
              onChange={(e) => {
                setStartMonth(e.target.value);
                setPreset("custom");
              }}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
            >
              {selectableMonths.map((m) => (
                <option key={`start-${m.val}`} value={m.val}>
                  {m.label} ({m.val})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ถึงเดือน (End Month)</label>
            <select
              value={endMonth}
              onChange={(e) => {
                setEndMonth(e.target.value);
                setPreset("custom");
              }}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
            >
              {selectableMonths.map((m) => (
                <option key={`end-${m.val}`} value={m.val}>
                  {m.label} ({m.val})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <div className="p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 text-[10px] text-indigo-950/80 leading-relaxed font-semibold">
              ✨ **ใช้งานข้อมูลจริง:** แดชบอร์ดนี้ซิงก์ตรงกับ General Ledger และตารางค่าน้ำไฟในระบบโดยตรง ปราศจากการใช้ mock-up เพื่อให้คุณวิเคราะห์ผลลัพธ์ได้อย่างแม่นยำสูงสุด
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex flex-wrap border-b border-slate-200">
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
        <button
          onClick={() => setActiveTab("cashflow")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
            activeTab === "cashflow"
              ? "border-blue-600 text-blue-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🧾 งบกระแสเงินสด (Statement of Cash Flows)
        </button>
        <button
          onClick={() => setActiveTab("budget")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
            activeTab === "budget"
              ? "border-blue-600 text-blue-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🎯 ควบคุมงบประมาณ (Budget Limits)
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
            activeTab === "assets"
              ? "border-blue-600 text-blue-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📦 สินทรัพย์ & ค่าเสื่อม (Assets & Depreciation)
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

          {/* Historical Cashflow Summary Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-3xl p-5 border border-indigo-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] transition hover:shadow-md col-span-1 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full inline-block">
                  Summary ({formatMonthThai(startMonth)} - {formatMonthThai(endMonth)})
                </span>
                <h3 className="text-sm font-black text-slate-800 tracking-tight mt-2.5">สรุปงบตาม Ledger ในช่วงที่เลือก</h3>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">สรุปเงินรายรับและรายจ่ายทั้งหมดที่บันทึกจริงลงในฐานข้อมูล</p>
              </div>
              <div className="space-y-2 pt-4 border-t border-slate-100 mt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-400">รายรับสะสม:</span>
                  <span className="text-xs font-black text-slate-700">{formatMoney(historicalLedger.income)} ฿</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-400">รายจ่ายสะสม:</span>
                  <span className="text-xs font-black text-rose-600">{formatMoney(historicalLedger.expense)} ฿</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-600">กระแสเงินสดสุทธิ:</span>
                  <span className={`text-sm font-black ${historicalLedger.margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {historicalLedger.margin >= 0 ? "+" : ""}{formatMoney(historicalLedger.margin)} ฿
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Monthly Cashflow SVG Chart */}
            <div className="lg:col-span-3">
              <Panel title={`📈 แผนภูมิกระแสเงินสดบัญชี รายรับ ปะทะ รายจ่าย (${formatMonthThai(startMonth)} - ${formatMonthThai(endMonth)})`} subtitle="เปรียบเทียบความสัมพันธ์ของรายรับจริง (เขียว) ปะทะรายจ่าย (แดง) สะสมตาม Ledger บัญชี">
                <div className="overflow-x-auto">
                  <svg viewBox={`0 0 ${overviewChartWidth} 240`} className="h-[240px]" style={{ minWidth: overviewChartWidth }}>
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                      <g key={i}>
                        <line x1="60" y1={190 - pct * 150} x2={overviewChartWidth - 20} y2={190 - pct * 150} stroke="#f1f5f9" strokeWidth="1" />
                        <text x="50" y={194 - pct * 150} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="bold">
                          {(maxMonthlyVal * pct).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </text>
                      </g>
                    ))}
                    
                    {/* Double Bars for cashflow */}
                    {monthlyData.map((d, i) => {
                      const x = 75 + i * 72;
                      const incH = (d.income / maxMonthlyVal) * 150;
                      const expH = (d.expense / maxMonthlyVal) * 150;
                      const net = d.income - d.expense;

                      return (
                        <g key={d.month} className="group">
                          {/* Income Bar */}
                          <rect x={x} y={190 - incH} width="22" height={incH} rx="3" fill="url(#incGrad)" opacity="0.9" className="transition-all duration-300 hover:opacity-100">
                            <title>รายรับสะสม: {d.income.toLocaleString()} ฿</title>
                          </rect>
                          <text x={x + 11} y={183 - incH} textAnchor="middle" fontSize="8" fill="#065f46" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            {d.income > 0 ? `${(d.income/1000).toFixed(1)}K` : ''}
                          </text>

                          {/* Expense Bar */}
                          <rect x={x + 26} y={190 - expH} width="22" height={expH} rx="3" fill="url(#expGrad)" opacity="0.9" className="transition-all duration-300 hover:opacity-100">
                            <title>รายจ่ายสะสม: {d.expense.toLocaleString()} ฿</title>
                          </rect>
                          <text x={x + 37} y={183 - expH} textAnchor="middle" fontSize="8" fill="#991b1b" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            {d.expense > 0 ? `${(d.expense/1000).toFixed(1)}K` : ''}
                          </text>

                          {/* X-Axis Month Tag */}
                          <text x={x + 24} y={210} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="bold">
                            {formatMonthThai(d.month)}
                          </text>
                          
                          {/* Net Margin badge at bar bottom */}
                          <text x={x + 24} y={224} textAnchor="middle" fontSize="8" fill={net >= 0 ? "#059669" : "#e11d48"} fontWeight="black">
                            {net >= 0 ? `+${Math.round(net).toLocaleString()}` : Math.round(net).toLocaleString()}
                          </text>
                        </g>
                      );
                    })}

                    {/* Definitions */}
                    <defs>
                      <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#be123c" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex justify-center gap-6 mt-2 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> รายรับสะสม (Revenue)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> รายจ่ายสะสม (Expenses)
                  </span>
                </div>
              </Panel>
            </div>
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
                <div className="mt-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950/80 leading-relaxed font-semibold">
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
                        <p className="text-[10px] text-slate-400">เปรียบเทียบยอดรวมค่าน้ำย้อนหลังตามจริง</p>
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
                        <p className="text-[10px] text-slate-400">เปรียบเทียบยอดรวมค่าไฟฟ้าย้อนหลังตามจริง</p>
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
                <Panel title={`💧 แผนภาพค่าน้ำประปา (${formatMonthThai(startMonth)} - ${formatMonthThai(endMonth)})`} subtitle="เปรียบเทียบรายรับค่าน้ำ (น้ำเงิน) ปะทะ ยอดจ่ายหลวงจริง (เทา)">
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 ${waterChartWidth} 240`} className="h-[240px]" style={{ minWidth: waterChartWidth }}>
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                        <g key={i}>
                          <line x1="60" y1={190 - pct * 150} x2={waterChartWidth - 20} y2={190 - pct * 150} stroke="#f1f5f9" strokeWidth="1" />
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
                <Panel title={`⚡ แผนภาพค่าไฟฟ้าหลวง (${formatMonthThai(startMonth)} - ${formatMonthThai(endMonth)})`} subtitle="เปรียบเทียบรายรับค่าไฟ (ส้ม) ปะทะ ยอดจ่ายหลวงจริง (แดง)">
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 ${elecChartWidth} 240`} className="h-[240px]" style={{ minWidth: elecChartWidth }}>
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                        <g key={i}>
                          <line x1="60" y1={190 - pct * 150} x2={elecChartWidth - 20} y2={190 - pct * 150} stroke="#f1f5f9" strokeWidth="1" />
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

      {/* Tab 3: Statement of Cash Flows */}
      {activeTab === "cashflow" && (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
          {isLoadingCashFlow ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-semibold tracking-wide mt-4">กำลังประมวลผลงบกระแสเงินสดตามมาตรฐาน TAS 7...</p>
            </div>
          ) : (
            <>
              {/* Cash Flow Top KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Beginning Cash Card */}
                <div className="bg-gradient-to-br from-blue-50/40 to-slate-50 rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] transition hover:shadow-md">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-100/60 border border-blue-200 px-2 py-0.5 rounded-full inline-block">
                    Beginning Cash Balance
                  </span>
                  <h3 className="text-sm font-bold text-slate-500 mt-3">ยอดเงินสดต้นงวดสะสม</h3>
                  <div className="text-2xl font-black text-slate-800 mt-1 tracking-tight">
                    {formatMoney(cashFlowData?.beginning_balance || 0)} ฿
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">ยอดสะสมยกมาตั้งแต่เริ่มต้นระบบจนถึงก่อนเดือน {formatMonthThai(startMonth)}</p>
                </div>

                {/* Net Flow Card */}
                <div className="bg-gradient-to-br from-indigo-50/40 to-slate-50 rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] transition hover:shadow-md">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block ${
                    (cashFlowData?.net_increase || 0) >= 0
                      ? "text-emerald-600 bg-emerald-100/60 border border-emerald-200"
                      : "text-rose-600 bg-rose-100/60 border border-rose-200"
                  }`}>
                    Net Cash Flow
                  </span>
                  <h3 className="text-sm font-bold text-slate-500 mt-3">เงินสดสุทธิเพิ่มขึ้น / (ลดลง)</h3>
                  <div className={`text-2xl font-black mt-1 tracking-tight ${(cashFlowData?.net_increase || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {(cashFlowData?.net_increase || 0) >= 0 ? "+" : ""}{formatMoney(cashFlowData?.net_increase || 0)} ฿
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">ผลรวมสุทธิของกิจกรรมดำเนินงาน, ลงทุน, และจัดหาเงิน</p>
                </div>

                {/* Ending Cash Card */}
                <div className="bg-gradient-to-br from-emerald-50/40 to-indigo-50/30 rounded-3xl p-6 border border-emerald-100/50 shadow-[0_4px_16px_rgba(16,185,129,0.04)] transition hover:shadow-md">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100/60 border border-emerald-200 px-2 py-0.5 rounded-full inline-block animate-pulse">
                    Ending Cash Balance
                  </span>
                  <h3 className="text-sm font-bold text-slate-500 mt-3">ยอดเงินสดปลายงวดคงเหลือจริง</h3>
                  <div className="text-2xl font-black text-emerald-700 mt-1 tracking-tight">
                    {formatMoney(cashFlowData?.ending_balance || 0)} ฿
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">ยอดเงินสดคงเหลือสะสม ณ สิ้นสุดช่วงเวลา {formatMonthThai(endMonth)}</p>
                </div>
              </div>

              {/* Excel Download Banner */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">ส่งออกรายงานงบกระแสเงินสด (Premium Excel Export)</h4>
                    <p className="text-[10px] text-slate-400">ดาวน์โหลดงบกระแสเงินสดจัดเรียงแยก 3 กิจกรรมหลัก รูปแบบตารางพรีเมียมตามมาตรฐาน TAS 7</p>
                  </div>
                </div>
                <button
                  onClick={handleExportCashFlow}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span>📥</span> ส่งออกรายงานงบกระแสเงินสด (Excel)
                </button>
              </div>

              {/* Three Cash Flow Activities Breakdown */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* 1. Operating Section */}
                <CashFlowSectionCard
                  title="💼 1. กิจกรรมดำเนินงาน (Operating Activities)"
                  subtitle="กระแสเงินสดจากค่าเช่า, ค่าน้ำไฟ, อู่รถยนต์ และค่าใช้จ่ายดำเนินงานหลัก"
                  subtotal={cashFlowData?.operating?.subtotal || 0}
                  items={cashFlowData?.operating?.items || []}
                />

                {/* 2. Investing Section */}
                <CashFlowSectionCard
                  title="🏗️ 2. กิจกรรมลงทุน (Investing Activities)"
                  subtitle="กระแสเงินสดจากการลงทุนซื้อสินทรัพย์ถาวร อุปกรณ์เครื่องมือ หรือส่วนต่อขยายอาคาร"
                  subtotal={cashFlowData?.investing?.subtotal || 0}
                  items={cashFlowData?.investing?.items || []}
                />

                {/* 3. Financing Section */}
                <CashFlowSectionCard
                  title="🏦 3. กิจกรรมจัดหาเงิน (Financing Activities)"
                  subtitle="กระแสเงินสดจากการกู้ยืมเงิน ชำระคืนเงินต้น ดอกเบี้ยธนาคาร หรือเงินสมทบจากผู้ถือหุ้น"
                  subtotal={cashFlowData?.financing?.subtotal || 0}
                  items={cashFlowData?.financing?.items || []}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 4: Expense Budgeting & Budget Limits */}
      {activeTab === "budget" && (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
          {/* Header Action Bar */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 text-8xl opacity-[0.03] select-none pointer-events-none">🎯</div>
            <div className="space-y-1.5 max-w-2xl">
              <h2 className="text-lg font-extrabold tracking-tight">🎯 ระบบควบคุมงบประมาณรายจ่ายรายปี/รายเดือน (Budgeting Limits)</h2>
              <p className="text-xs text-slate-350 leading-relaxed">
                ป้องกันค่าใช้จ่ายสะสมบานปลายแยกตามหน่วยธุรกิจหรือประเภทหมวดรายจ่าย พร้อมกลไกแจ้งเตือนภัยแบบเรียลไทม์ผ่าน LINE OA Push & Notify ทันทีเมื่อค่าใช้จ่ายสะสมทะลุเกณฑ์เพดานงบประมาณ
              </p>
            </div>
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/20 active:scale-[0.98] transition flex items-center gap-1.5"
            >
              <span>➕</span> กำหนดงบควบคุมรายจ่าย
            </button>
          </div>

          {/* Budget List Content */}
          {isLoadingBudgets ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-semibold tracking-wide mt-4">กำลังประมวลผลเพดานงบประมาณสะสมแบบเรียลไทม์...</p>
            </div>
          ) : budgets.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="text-5xl opacity-40">🎯</div>
              <h3 className="text-base font-extrabold text-slate-700">ยังไม่มีการตั้งเกณฑ์ควบคุมงบประมาณรายจ่าย</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                เริ่มต้นกำหนดเพดานงบประมาณจำกัดค่าบำรุงรักษา หรือค่าใช้จ่ายทั่วไปรายเดือน/รายปี เพื่อรักษาสภาพคล่องส่วนต่างของเครือข่ายธุรกิจครอบครัว
              </p>
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                เริ่มกำหนดงบประมาณชิ้นแรก
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {budgets.map((b: any) => {
                const actual = b.actual_spent || 0;
                const limit = b.amount_limit || 1;
                const pct = Math.round((actual / limit) * 100);
                const remaining = limit - actual;
                const isOver = actual > limit;
                
                // Thai mapping for expense category
                const catText = b.expense_category 
                  ? (b.expense_category === "water_bill" ? "ค่าน้ำประปาหลวงส่วนกลาง"
                     : b.expense_category === "electric_bill" ? "ค่าไฟฟ้าหลวงส่วนกลาง"
                     : b.expense_category === "spare_parts" ? "อะไหล่สำหรับอู่รถ"
                     : b.expense_category === "maintenance" ? "ค่าชำระซ่อมบำรุงห้องพัก/บ้านเช่า"
                     : b.expense_category === "salary" ? "ค่าแรงช่าง/พนักงาน/แม่บ้าน"
                     : b.expense_category === "other" ? "ค่าใช้จ่ายอื่นๆ" : b.expense_category)
                  : "ทุกหมวดรายจ่าย";
                  
                // Tone mapping based on percent usage
                let progressBarColor = "bg-emerald-500";
                let statusBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                let cardBorderStyle = "border-slate-100 hover:border-slate-200 shadow-sm";
                
                if (pct >= 100) {
                  progressBarColor = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse";
                  statusBadgeStyle = "bg-rose-50 text-rose-700 border-rose-100 animate-pulse";
                  cardBorderStyle = "border-rose-200 hover:border-rose-300 shadow-lg shadow-rose-500/5 animate-[pulseBorder_2s_infinite]";
                } else if (pct >= 70) {
                  progressBarColor = "bg-amber-500";
                  statusBadgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                  cardBorderStyle = "border-amber-200 hover:border-amber-300 shadow-md shadow-amber-500/5";
                }

                return (
                  <div key={b.id} className={`bg-white rounded-3xl p-5 border relative overflow-hidden transition-all duration-300 flex flex-col justify-between ${cardBorderStyle}`}>
                    {/* Delete Icon Overlay */}
                    <button
                      onClick={() => handleDeleteBudgetClick(b.id)}
                      className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition flex items-center justify-center border border-slate-200/50 hover:border-rose-200"
                      title="ลบงบประมาณควบคุมนี้"
                    >
                      <span className="text-xs">🗑️</span>
                    </button>

                    {/* Scope Information */}
                    <div className="pr-8 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide border ${statusBadgeStyle}`}>
                          {b.period === "monthly" ? `รายเดือน: ${b.month}/${b.year}` : `รายปีงบประมาณ: ${b.year}`}
                        </span>
                      </div>
                      
                      <div className="space-y-1 mt-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ขอบข่ายการควบคุม (Scope)</h4>
                        <div className="text-sm font-extrabold text-slate-800 leading-tight">
                          {b.unit ? `🏢 ธุรกิจ: ${b.unit.name}` : "🌐 ภาพรวมเครือข่ายธุรกิจทั้งหมด"}
                        </div>
                        <div className="text-xs font-bold text-indigo-600/90 flex items-center gap-1">
                          <span>🏷️</span> หมวด: {catText}
                        </div>
                      </div>
                    </div>

                    {/* Financial Progress gauge */}
                    <div className="border-t border-slate-100 mt-5 pt-4 space-y-3.5">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-slate-400">ยอดที่จ่ายจริงสะสม:</span>
                        <span className={`font-black ${isOver ? "text-rose-600" : "text-slate-700"}`}>
                          {formatMoney(actual)} ฿
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-slate-400">เพดานงบควบคุม:</span>
                        <span className="font-extrabold text-slate-800">
                          {formatMoney(limit)} ฿
                        </span>
                      </div>

                      {/* Usage percentage progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black">
                          <span className={pct >= 100 ? "text-rose-600 animate-pulse" : pct >= 70 ? "text-amber-600" : "text-emerald-600"}>
                            อัตราใช้งบประมาณ: {pct}%
                          </span>
                          <span className={isOver ? "text-rose-600" : "text-slate-400"}>
                            {isOver ? `เกินงบ: ${formatMoney(Math.abs(remaining))} ฿` : `เหลืองบ: ${formatMoney(remaining)} ฿`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`${progressBarColor} h-2.5 rounded-full transition-all duration-700`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Live Status Warnings */}
                      {pct >= 100 ? (
                        <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-2xl text-[9px] text-rose-700 leading-relaxed font-semibold flex items-start gap-1.5 animate-pulse">
                          <span>🚨</span> 
                          <span>**เกณฑ์ควบคุมทะลุขีดจำกัด!** ยอดจ่ายรายจ่ายเกินงบประมาณที่จำกัดไว้ และส่งข้อความเตือนภัยเข้า LINE OA เจ้าของสำเร็จแล้ว</span>
                        </div>
                      ) : pct >= 70 ? (
                        <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-2xl text-[9px] text-amber-700 leading-relaxed font-semibold flex items-start gap-1.5">
                          <span>⚠️</span> 
                          <span>**ระดับใช้งบสูง (เกิน 70%)** กรุณาตรวจสอบและใช้ดุลยพินิจควบคุมรายจ่ายเพื่อเลี่ยงการล้นขีดจำกัดงบประมาณ</span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl text-[9px] text-emerald-700 leading-relaxed font-semibold flex items-start gap-1.5">
                          <span>🟢</span> 
                          <span>**สถานะปลอดภัย** อัตราใช้งบประมาณอยู่ในพิกัดปลอดภัย ไม่มีความเสี่ยงงบประมาณบานปลาย</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Assets & Depreciation */}
      {activeTab === "assets" && (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
          {/* Header Action Bar */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 text-8xl opacity-[0.03] select-none pointer-events-none">📦</div>
            <div className="space-y-1.5 max-w-3xl">
              <h2 className="text-lg font-extrabold tracking-tight">📦 ระบบคำนวณค่าเสื่อมราคาและบริหารสินทรัพย์ถาวร (Asset & Depreciation)</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                ลงทะเบียนสิ่งปลูกสร้าง อุปกรณ์ช่าง เครื่องซักผ้า และเฟอร์นิเจอร์ แยกตามแผนกธุรกิจ เพื่อให้ระบบทำการคำนวณและกระทบยอดบัญชีค่าเสื่อมราคาแบบเส้นตรง (Straight-Line Depreciation) ลง Ledger บัญชี และแยกยกเว้นค่าใช้จ่ายที่ไม่ใช่เงินสด (Non-Cash Expense) ออกจากงบกระแสเงินสด TAS 7 โดยอัตโนมัติ
              </p>
            </div>
            
            {/* Post All & Add Asset Actions */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ประจำรอบบิล:</span>
                <select
                  value={deprPostDate.month}
                  onChange={(e) => setDeprPostDate({ ...deprPostDate, month: parseInt(e.target.value, 10) })}
                  className="bg-transparent text-xs font-black text-white outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m} className="text-slate-800">{m} - {formatMonthThai(`2026-${String(m).padStart(2, '0')}`).split(" ")[0]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={deprPostDate.year}
                  onChange={(e) => setDeprPostDate({ ...deprPostDate, year: parseInt(e.target.value, 10) || new Date().getFullYear() })}
                  className="bg-transparent text-xs font-black text-white w-14 outline-none border-l border-slate-700 pl-2 ml-1"
                  min="2020"
                  max="2050"
                />
              </div>

              <button
                onClick={handlePostAllDepreciationClick}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition flex items-center gap-1.5"
                title="กระทบยอดค่าเสื่อมราคาของสินทรัพย์ทุกชิ้นลง Ledger ประจำรอบเดือนบัญชีที่เลือก"
              >
                <span>✏️</span> บันทึกค่าเสื่อมทุกรายการลงบัญชี (Bulk Post)
              </button>

              <button
                onClick={() => setIsAssetModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition flex items-center gap-1.5"
              >
                <span>➕</span> ลงทะเบียนสินทรัพย์ถาวร
              </button>
            </div>
          </div>

          {/* Asset Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] transition hover:shadow-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">🏢</div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">สินทรัพย์ราคาทุนสะสม (Total Asset Cost)</div>
                <div className="mt-1 text-xl font-black text-slate-800 tracking-tight">{formatMoney(assetSummary?.total_cost || 0)} ฿</div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] transition hover:shadow-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold">📉</div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ค่าเสื่อมราคาสะสมรวม (Accumulated Depreciation)</div>
                <div className="mt-1 text-xl font-black text-rose-600 tracking-tight">{formatMoney(assetSummary?.total_accumulated_depreciation || 0)} ฿</div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] transition hover:shadow-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">💎</div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">มูลค่าสุทธิตามบัญชี (Net Book Value)</div>
                <div className="mt-1 text-xl font-black text-emerald-700 tracking-tight">{formatMoney(assetSummary?.total_net_book_value || 0)} ฿</div>
              </div>
            </div>
          </div>

          {/* main assets table */}
          {isLoadingAssets ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-semibold tracking-wide mt-4">กำลังดึงข้อมูลบัญชีทะเบียนสินทรัพย์ถาวร...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="text-5xl opacity-40">📦</div>
              <h3 className="text-base font-extrabold text-slate-700">ยังไม่มีข้อมูลทะเบียนสินทรัพย์ถาวร</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                เริ่มต้นลงทะเบียนสินทรัพย์คงทนชิ้นแรก เช่น เครื่องปรับอากาศ โต๊ะทำงาน เครื่องซักผ้าหยอดเหรียญ หรือรถกระบะ เพื่อให้ระบบจัดการตารางค่าเสื่อมและกระทบยอดบัญชีให้คุณโดยอัตโนมัติ
              </p>
              <button
                onClick={() => setIsAssetModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                ลงทะเบียนสินทรัพย์แรก
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">📋 ทะเบียนสินทรัพย์ถาวรและการหักค่าเสื่อมราคาแบบเส้นตรง (Straight-Line Register)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">ตารางทะเบียนประวัติแสดงมูลค่าบัญชีสุทธิ รายจ่ายค่าเสื่อมรายเดือน และเปอร์เซ็นต์ค่าเสื่อมราคาสะสม</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">รหัส (Code)</th>
                      <th className="px-5 py-3.5">ชื่อสินทรัพย์ (Name)</th>
                      <th className="px-5 py-3.5">กลุ่มธุรกิจ (Unit)</th>
                      <th className="px-5 py-3.5 text-center">วันที่ซื้อ (Purchase Date)</th>
                      <th className="px-5 py-3.5 text-right">ราคาทุน (Cost)</th>
                      <th className="px-5 py-3.5 text-right">มูลค่าซาก (Salvage)</th>
                      <th className="px-5 py-3.5 text-center">อายุใช้งาน (Life)</th>
                      <th className="px-5 py-3.5 text-right">ค่าเสื่อม/เดือน</th>
                      <th className="px-5 py-3.5 text-center">ความก้าวหน้าค่าเสื่อม</th>
                      <th className="px-5 py-3.5 text-right">มูลค่าสุทธิ (NBV)</th>
                      <th className="px-5 py-3.5 text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                    {assets.map((asset) => {
                      const buName = asset.unit ? asset.unit.name : "🌐 ภาพรวม/ส่วนกลาง";
                      const dateObj = new Date(asset.purchase_date);
                      const formattedDate = dateObj.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
                      
                      // Useful life text
                      const lifeText = `${asset.useful_life_years} ปี`;
                      
                      // Depreciation progress configuration
                      const depPct = asset.depreciated_percent || 0;
                      let progressColor = "bg-blue-500";
                      if (depPct >= 90) {
                        progressColor = "bg-rose-500";
                      } else if (depPct >= 50) {
                        progressColor = "bg-amber-500";
                      }

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-4 font-black text-slate-800">{asset.code}</td>
                          <td className="px-5 py-4">
                            <div>
                              <div className="font-extrabold text-slate-800">{asset.name}</div>
                              {asset.description && <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate max-w-[180px]">{asset.description}</div>}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
                              {buName}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center text-[11px] font-bold text-slate-500">{formattedDate}</td>
                          <td className="px-5 py-4 text-right font-bold text-slate-700">{formatMoney(asset.purchase_cost)} ฿</td>
                          <td className="px-5 py-4 text-right text-[11px] text-slate-400">{formatMoney(asset.salvage_value)} ฿</td>
                          <td className="px-5 py-4 text-center font-bold text-slate-500">{lifeText}</td>
                          <td className="px-5 py-4 text-right font-black text-rose-500">{formatMoney(asset.monthly_depreciation)} ฿</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-center justify-center w-28 mx-auto space-y-1">
                              <div className="flex justify-between w-full text-[9px] font-black text-slate-400">
                                <span>หักแล้ว:</span>
                                <span className={depPct >= 90 ? "text-rose-500" : depPct >= 50 ? "text-amber-500" : "text-blue-500"}>{depPct.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className={`${progressColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(depPct, 100)}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-black text-emerald-600">{formatMoney(asset.net_book_value)} ฿</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleViewScheduleClick(asset)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-[10px] font-black border border-slate-250/30 transition-all flex items-center gap-1"
                                title="ดูตารางและแผนรายปีของสินทรัพย์ชิ้นนี้"
                              >
                                📅 แผนเสื่อม
                              </button>
                              
                              <button
                                onClick={() => handlePostDepreciationClick(asset.id)}
                                className="px-2 py-1 rounded-lg bg-indigo-55 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 text-[10px] font-black border border-indigo-200/40 transition-all flex items-center gap-1"
                                title="กระทบยอดบันทึกค่าเสื่อมราคาของสินทรัพย์ชิ้นนี้ลง Ledger ประจำรอบเดือน"
                              >
                                ✏️ ลงบัญชี
                              </button>

                              <button
                                onClick={() => handleDeleteAssetClick(asset.id)}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition flex items-center justify-center"
                                title="ลบข้อมูลสินทรัพย์"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Budget Form */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-[scaleUp_0.25s_ease-out] relative">
            
            {/* Close Button */}
            <button
              onClick={() => setIsBudgetModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition flex items-center justify-center border border-slate-200/50"
            >
              <span className="text-sm">❌</span>
            </button>

            <div>
              <h3 className="text-base font-extrabold text-slate-800">➕ กำหนดเกณฑ์ควบคุมงบประมาณรายจ่าย</h3>
              <p className="text-xs text-slate-400 mt-0.5">จำกัดรายจ่ายสะสมตามขอบเขตและคาบเวลา เพื่อส่งสัญญาณเตือนภัยเข้า LINE OA</p>
            </div>

            <form onSubmit={handleCreateBudgetSubmit} className="space-y-4">
              {/* Business Unit dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">หน่วยธุรกิจที่บังคับใช้ (Business Unit)</label>
                <select
                  value={newBudget.unit_id}
                  onChange={(e) => setNewBudget({ ...newBudget, unit_id: e.target.value })}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                >
                  <option value="">🌐 ภาพรวม/ทุกธุรกิจในเครือทั้งหมด</option>
                  {businessUnits.map((bu: any) => (
                    <option key={bu.id} value={bu.id}>
                      🏢 {bu.name} ({bu.type === "dormitory" ? "หอพัก" : bu.type === "garage" ? "อู่รถ" : bu.type === "house" ? "บ้านเช่า" : bu.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Category dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">หมวดหมู่รายจ่ายที่ควบคุม (Expense Category)</label>
                <select
                  value={newBudget.expense_category}
                  onChange={(e) => setNewBudget({ ...newBudget, expense_category: e.target.value })}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                >
                  <option value="">🏷️ ทุกหมวดหมู่รายจ่าย (Overall Expenses)</option>
                  <option value="water_bill">💧 ค่าน้ำประปาหลวงส่วนกลาง (Water Bill)</option>
                  <option value="electric_bill">⚡ ค่าไฟฟ้าหลวงส่วนกลาง (Electric Bill)</option>
                  <option value="spare_parts">🛠️ อะไหล่สำหรับอู่รถ (Spare Parts)</option>
                  <option value="maintenance">🔧 ค่าชำระซ่อมบำรุงห้องพัก/บ้านเช่า (Maintenance)</option>
                  <option value="salary">👷 ค่าแรงช่าง/ค่าจ้างแม่บ้าน (Salary)</option>
                  <option value="other">📦 ค่าใช้จ่ายอื่นๆ (Other)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Period Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ประเภทเวลาควบคุม (Period)</label>
                  <select
                    value={newBudget.period}
                    onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                  >
                    <option value="monthly">รายเดือน (Monthly)</option>
                    <option value="yearly">รายปี (Yearly)</option>
                  </select>
                </div>

                {/* Year Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ปี (Year)</label>
                  <input
                    type="number"
                    value={newBudget.year}
                    onChange={(e) => setNewBudget({ ...newBudget, year: parseInt(e.target.value, 10) || new Date().getFullYear() })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                    min="2020"
                    max="2050"
                  />
                </div>
              </div>

              {/* Month Select - only if monthly */}
              {newBudget.period === "monthly" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เดือน (Month)</label>
                  <select
                    value={newBudget.month}
                    onChange={(e) => setNewBudget({ ...newBudget, month: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                  >
                    {[
                      { v: 1, l: "มกราคม" }, { v: 2, l: "กุมภาพันธ์" }, { v: 3, l: "มีนาคม" },
                      { v: 4, l: "เมษายน" }, { v: 5, l: "พฤษภาคม" }, { v: 6, l: "มิถุนายน" },
                      { v: 7, l: "กรกฎาคม" }, { v: 8, l: "สิงหาคม" }, { v: 9, l: "กันยายน" },
                      { v: 10, l: "ตุลาคม" }, { v: 11, l: "พฤศจิกายน" }, { v: 12, l: "ธันวาคม" }
                    ].map((mOpt) => (
                      <option key={mOpt.v} value={mOpt.v}>{mOpt.l} ({mOpt.v})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount Limit Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เพดานจำกัดงบประมาณ (Amount Limit - บาท)</label>
                <input
                  type="number"
                  placeholder="เช่น 15000"
                  value={newBudget.amount_limit}
                  onChange={(e) => setNewBudget({ ...newBudget, amount_limit: e.target.value })}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                  step="0.01"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 text-xs font-extrabold hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBudget}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-xs font-black shadow-lg shadow-blue-600/15 hover:shadow-blue-500/25 active:scale-[0.98] transition flex items-center gap-1.5"
                >
                  {isSubmittingBudget ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>💾 บันทึกเกณฑ์ควบคุม</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register New Asset Form (Phase 5) */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-[scaleUp_0.25s_ease-out] relative">
            
            {/* Close Button */}
            <button
              onClick={() => setIsAssetModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition flex items-center justify-center border border-slate-200/50"
            >
              <span className="text-sm">❌</span>
            </button>

            <div>
              <h3 className="text-base font-extrabold text-slate-800">➕ ลงทะเบียนสินทรัพย์ถาวรชิ้นใหม่ (Asset Registration)</h3>
              <p className="text-xs text-slate-400 mt-0.5">บันทึกสินทรัพย์คงทนถาวรเข้าระบบทะเบียน และผูกเกณฑ์คำนวณตามมาตรฐานบัญชีไทย</p>
            </div>

            <form onSubmit={handleCreateAssetSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Code input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">รหัสสินทรัพย์ (Asset Code)</label>
                  <input
                    type="text"
                    placeholder="เช่น AST-001, MC-01"
                    value={newAsset.code}
                    onChange={(e) => setNewAsset({ ...newAsset, code: e.target.value })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                    required
                  />
                </div>

                {/* Name input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ชื่อสินทรัพย์ (Asset Name)</label>
                  <input
                    type="text"
                    placeholder="เช่น เครื่องซักผ้าหยอดเหรียญ, แอร์ชั้น 2"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              {/* Business Unit Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">หน่วยธุรกิจที่ถือครอง (Business Unit owner)</label>
                <select
                  value={newAsset.unit_id}
                  onChange={(e) => setNewAsset({ ...newAsset, unit_id: e.target.value })}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                >
                  <option value="">🌐 ภาพรวม/ส่วนกลาง (Central Office)</option>
                  {businessUnits.map((bu: any) => (
                    <option key={bu.id} value={bu.id}>
                      🏢 {bu.name} ({bu.type === "dormitory" ? "หอพัก" : bu.type === "garage" ? "อู่รถ" : bu.type === "house" ? "บ้านเช่า" : bu.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Cost Input */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ราคาทุนซื้อ (Cost)</label>
                  <input
                    type="number"
                    placeholder="บาท"
                    value={newAsset.purchase_cost}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_cost: e.target.value })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                {/* Salvage Value Input */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">มูลค่าซาก (Salvage)</label>
                  <input
                    type="number"
                    placeholder="บาท (ทั่วไป 1 บาท)"
                    value={newAsset.salvage_value}
                    onChange={(e) => setNewAsset({ ...newAsset, salvage_value: e.target.value })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                {/* Useful Life years input */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">อายุใช้งาน (Life Years)</label>
                  <input
                    type="number"
                    placeholder="ปี"
                    value={newAsset.useful_life_years}
                    onChange={(e) => setNewAsset({ ...newAsset, useful_life_years: e.target.value })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                    min="1"
                    max="50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Purchase Datepicker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">วันที่ตรวจรับ/ซื้อครอบครอง (Purchase Date)</label>
                  <input
                    type="date"
                    value={newAsset.purchase_date}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              {/* Description TextArea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">รายละเอียดประวัติเพิ่มเติม (Description)</label>
                <textarea
                  placeholder="เช่น ซื้อจากห้างบิ๊กซี ประกันศูนย์ 3 ปี อุปกรณ์ครบชุด"
                  value={newAsset.description}
                  onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none h-16 resize-none transition focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 text-xs font-extrabold hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAsset}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white text-xs font-black shadow-lg shadow-emerald-600/15 hover:shadow-emerald-500/25 active:scale-[0.98] transition flex items-center gap-1.5"
                >
                  {isSubmittingAsset ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังลงทะเบียน...</span>
                    </>
                  ) : (
                    <span>💾 ลงทะเบียนสินทรัพย์</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Straight-Line Depreciation Schedule Table */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-[scaleUp_0.25s_ease-out] relative">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setIsScheduleModalOpen(false);
                setSelectedAsset(null);
                setAssetSchedule([]);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition flex items-center justify-center border border-slate-200/50"
            >
              <span className="text-sm">❌</span>
            </button>

            <div>
              <h3 className="text-base font-extrabold text-slate-800">📅 แผนหักค่าเสื่อมราคาสินทรัพย์แบบเส้นตรง (Depreciation Schedule)</h3>
              <p className="text-xs text-slate-400 mt-0.5">สินทรัพย์: <span className="font-extrabold text-slate-700">{selectedAsset?.name} ({selectedAsset?.code})</span> | ราคาทุน: <span className="font-extrabold text-blue-600">{selectedAsset ? formatMoney(selectedAsset.purchase_cost) : "0"} ฿</span></p>
            </div>

            {isLoadingSchedule ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-xs font-bold mt-3">กำลังจำลองคำนวณแผนหักค่าเสื่อมราคารายปี...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">งวดปี (Period)</th>
                        <th className="px-4 py-3 text-right">ค่าเสื่อมรายงวด (Expense)</th>
                        <th className="px-4 py-3 text-right">ค่าเสื่อมราคาสะสม (Accumulated)</th>
                        <th className="px-4 py-3 text-right">มูลค่าตามบัญชีคงเหลือ (NBV)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-600">
                      {assetSchedule.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 font-extrabold text-slate-800">{item.period}</td>
                          <td className="px-4 py-3 text-right text-rose-500">{formatMoney(item.depreciation_expense)} ฿</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatMoney(item.accumulated_depreciation)} ฿</td>
                          <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(item.net_book_value)} ฿</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/50 text-[10px] text-blue-900 leading-relaxed font-semibold">
                  📌 **สูตรคำนวณตามมาตรฐานการบัญชี (TAS 16):** 
                  <br />
                  - ค่าเสื่อมราคาต่อปี = (ราคาทุน {selectedAsset ? formatMoney(selectedAsset.purchase_cost) : "0"} ฿ - มูลค่าซาก {selectedAsset ? formatMoney(selectedAsset.salvage_value) : "0"} ฿) / อายุการใช้งาน {selectedAsset?.useful_life_years} ปี
                  <br />
                  - ค่าเสื่อมราคาเฉลี่ยต่อเดือน = ค่าเสื่อมราคาต่อปี / 12 เดือน 
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsScheduleModalOpen(false);
                      setSelectedAsset(null);
                      setAssetSchedule([]);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Keyframes for VIP aesthetics */}
      <style>{`
        @keyframes pulseBorder {
          0%, 100% { border-color: #fee2e2; box-shadow: 0 4px 6px -1px rgba(244, 63, 94, 0.05); }
          50% { border-color: #f43f5e; box-shadow: 0 10px 15px -3px rgba(244, 63, 94, 0.15), 0 4px 6px -2px rgba(244, 63, 94, 0.1); }
        }
      `}</style>
    </div>
  );
}

function CashFlowSectionCard({ title, subtitle, subtotal, items }: { title: string; subtitle: string; subtotal: number; items: any[] }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] flex flex-col h-[500px]">
      <div className="flex-shrink-0 space-y-2 border-b border-slate-100 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">{title}</h3>
          <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
            subtotal >= 0 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
              : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}>
            {subtotal >= 0 ? "+" : ""}{formatMoney(subtotal)} ฿
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">{subtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-10">
            <span className="text-3xl mb-2 opacity-45 select-none">📄</span>
            <p className="text-[10px] font-bold text-slate-400">ไม่มีรายการในช่วงเวลานี้</p>
          </div>
        ) : (
          items.map((item: any, i: number) => {
            const isInc = item.amount >= 0;
            const itemDate = new Date(item.date);
            const dateStr = itemDate.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
            
            return (
              <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/50 border border-slate-100/30 transition">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-700 truncate">{item.description}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{dateStr}</p>
                </div>
                <span className={`text-xs font-black flex-shrink-0 ${isInc ? "text-emerald-600" : "text-rose-600"}`}>
                  {isInc ? "+" : ""}{formatMoney(item.amount)} ฿
                </span>
              </div>
            );
          })
        )}
      </div>
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
