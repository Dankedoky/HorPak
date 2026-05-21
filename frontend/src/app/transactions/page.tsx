"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  fetchTransactions, 
  fetchTransactionSummary, 
  createTransaction, 
  fetchUnits 
} from "@/lib/api";
import { TransactionType } from "@/lib/useTransactionData";

interface BusinessUnit {
  id: number;
  name: string;
  type: string;
}

interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  unit_id: number | null;
  created_at: string;
  unit?: BusinessUnit;
}

interface BusinessUnitSummary {
  id: number;
  name: string;
  type: string;
  total_income: number;
  total_expense: number;
  balance: number;
}

interface DashboardSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  units: BusinessUnitSummary[];
}

export default function FinancialAccountingPage() {
  // Database States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  // Modal Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTxType, setNewTxType] = useState<TransactionType>(TransactionType.INCOME);
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxDesc, setNewTxDesc] = useState("");
  const [newTxUnitId, setNewTxUnitId] = useState<string>("general");
  const [toastMessage, setToastMessage] = useState("");

  // Loading flag for SSR mount check
  const [isMounted, setIsMounted] = useState(false);

  // Data Fetching Function
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [txData, summaryData, unitList] = await Promise.all([
        fetchTransactions(),
        fetchTransactionSummary(),
        fetchUnits()
      ]);
      setTransactions(txData || []);
      setSummary(summaryData || null);
      setUnits(unitList || []);
      setError(null);
    } catch (err: unknown) {
      console.error(err);
      setError("ไม่สามารถเชื่อมต่อฐานข้อมูลการเงินได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);
    setTimeout(() => loadAllData(), 0);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Submit Handler for New Transaction
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newTxAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("กรุณากรอกจำนวนเงินให้ถูกต้องและมากกว่า 0");
      return;
    }
    if (!newTxDesc.trim()) {
      alert("กรุณาระบุรายละเอียดของรายการ");
      return;
    }

    setIsSubmitting(true);
    try {
      const unitIdPayload = newTxUnitId === "general" ? null : parseInt(newTxUnitId);
      await createTransaction({
        type: newTxType,
        amount: amount,
        description: newTxDesc.trim(),
        unit_id: unitIdPayload
      });

      // Clear Form & Close Modal
      setNewTxAmount("");
      setNewTxDesc("");
      setNewTxUnitId("general");
      setShowAddModal(false);
      
      triggerToast("🎉 บันทึกธุรกรรมการเงินเรียบร้อยแล้ว!");
      
      // Reload financial records
      await setTimeout(() => loadAllData(), 0);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลการเงิน: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unique Unit Options for Filtering
  const filterUnitOptions = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach((t) => {
      if (t.unit?.name) names.add(t.unit.name);
    });
    return Array.from(names).sort();
  }, [transactions]);

  // Filtering & Sorting Processed Transactions
  const processedTransactions = useMemo(() => {
    const result = transactions.filter((t) => {
      const matchType = filterType === "all" || t.type === filterType;
      const matchUnit = filterUnit === "all" || 
                        (filterUnit === "general" && !t.unit_id) || 
                        (t.unit?.name === filterUnit);
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.unit?.name || "ทั่วไป").toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date Filtering
      const txDate = new Date(t.created_at).getTime();
      const matchStart = !startDate || txDate >= new Date(startDate).getTime();
      // For end date, we want to include the whole day, so we add 23:59:59
      const matchEnd = !endDate || txDate <= new Date(endDate + "T23:59:59").getTime();

      return matchType && matchUnit && matchSearch && matchStart && matchEnd;
    });

    // Sorting Logic
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "highest") {
      result.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === "lowest") {
      result.sort((a, b) => a.amount - b.amount);
    }

    return result;
  }, [transactions, filterType, filterUnit, searchTerm, sortBy]);

  // Stats calculation dynamically adjusted by filters
  const filteredIncome = useMemo(() => {
    return processedTransactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [processedTransactions]);

  const filteredExpense = useMemo(() => {
    return processedTransactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [processedTransactions]);

  // Net Margins & Ratios (Calculated Globally)
  const globalTotalIncome = summary?.total_income || 0;
  const globalTotalExpense = summary?.total_expense || 0;
  const globalNetProfit = summary?.balance || 0;
  const profitMargin = globalTotalIncome > 0 
    ? Math.round((globalNetProfit / globalTotalIncome) * 100) 
    : 0;

  // Export to Excel-compatible CSV
  const exportToCSV = () => {
    if (processedTransactions.length === 0) {
      alert("ไม่มีรายการสำหรับส่งออก CSV");
      return;
    }
    const headers = ["วัน-เวลา", "ประเภท", "ธุรกิจ/หน่วยงาน", "รายละเอียด", "จำนวนเงิน (บาท)"];
    const rows = processedTransactions.map(t => [
      new Date(t.created_at).toLocaleString("th-TH"),
      t.type === TransactionType.INCOME ? "รายรับ" : "รายจ่าย",
      t.unit?.name || "ทั่วไป",
      t.description.replace(/,/g, " "),
      t.amount
    ]);
    
    // Excel-friendly UTF-8 BOM
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `accounting_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 z-50 flex items-center gap-2 text-xs font-bold animate-[slideUp_0.3s_ease-out]">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --- Page Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-2 inline-block">
            📈 Sovereign Vault Ledger
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>บัญชีและการเงิน</span>
            <span className="text-xs bg-slate-100 text-slate-500 font-extrabold px-2.5 py-0.5 rounded-full border border-slate-200">ระบบรวม</span>
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">วิเคราะห์กระแสเงินสด ควบคุมรายรับ-รายจ่ายของหน่วยธุรกิจทั้งหมดแบบเรียลไทม์</p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={loadAllData}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition shadow-sm cursor-pointer"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
          >
            <span>📥</span>
            <span>ส่งออกรายงาน (CSV)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <span>➕</span>
            <span>บันทึกธุรกรรม</span>
          </button>
        </div>
      </div>

      {/* --- Error Handling Alert --- */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2.5">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={loadAllData} className="ml-auto underline hover:text-rose-900">ลองใหม่อีกครั้ง</button>
        </div>
      )}

      {/* --- KPI Financial Stat Cards --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Net profit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl text-indigo-600">
            💰
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">เงินคงเหลือสุทธิ (Net Balance)</span>
            <div className="text-lg font-black text-slate-800 tracking-tight mt-0.5">
              {isMounted ? globalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00"}
              <span className="text-[10px] font-extrabold text-slate-400 ml-1">฿</span>
            </div>
            <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
              สภาพคล่องปัจจุบัน
            </span>
          </div>
        </div>

        {/* KPI 2: Gross Income */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl text-emerald-600">
            📈
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">รายรับสะสม (Revenue)</span>
            <div className="text-lg font-black text-emerald-600 tracking-tight mt-0.5">
              +{isMounted ? globalTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00"}
              <span className="text-[10px] font-extrabold text-emerald-400 ml-1">฿</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400">
              ยอดรับเงินเข้าทั้งหมด
            </span>
          </div>
        </div>

        {/* KPI 3: Total Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-xl text-rose-600">
            💸
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">รายจ่ายสะสม (Expenses)</span>
            <div className="text-lg font-black text-rose-600 tracking-tight mt-0.5">
              -{isMounted ? globalTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00"}
              <span className="text-[10px] font-extrabold text-rose-400 ml-1">฿</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400">
              ต้นทุนและการดูแลระบบ
            </span>
          </div>
        </div>

        {/* KPI 4: Profit Margin */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-xl text-amber-600">
            📊
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">อัตรากำไร (Net Margin)</span>
            <div className="text-lg font-black text-slate-800 tracking-tight mt-0.5">
              {isMounted ? profitMargin : 0}
              <span className="text-[10px] font-extrabold text-slate-400 ml-1">%</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400">
              ประสิทธิภาพการเก็บยอด
            </span>
          </div>
        </div>
      </div>

      {/* --- Visual Analytics Panel (SVG Chart & Breakdown) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SVG Flow Chart - Cash flow bar and ring */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">วิเคราะห์กระแสเงินสดเชิงเปรียบเทียบ</h3>
                <span className="text-[10px] text-slate-400 font-bold">เปรียบเทียบสัดส่วนระหว่างรายรับและรายจ่าย</span>
              </div>
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> รายรับ</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> รายจ่าย</span>
              </div>
            </div>

            {/* Custom SVG Cash flow graph */}
            <div className="relative w-full h-44 flex items-end justify-between bg-slate-50 rounded-2xl p-6 border border-slate-100">
              {/* Vertical Guide lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none opacity-40">
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
              </div>

              {/* Bar 1: Income */}
              <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                <span className="text-[10px] font-black text-emerald-600">
                  {isMounted ? globalTotalIncome.toLocaleString() : "0"} ฿
                </span>
                <div 
                  className="w-12 bg-emerald-500 rounded-t-xl transition-all duration-1000 shadow-md shadow-emerald-500/10 min-h-[12px]"
                  style={{
                    height: `${globalTotalIncome === 0 ? 5 : 90}%`
                  }}
                />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">รายรับทั้งหมด</span>
              </div>

              {/* Retention Indicator Ring in center */}
              <div className="flex-1 flex flex-col items-center justify-center h-full z-10">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle 
                      cx="40" cy="40" r="30" 
                      fill="none" 
                      stroke="#4f46e5" 
                      strokeWidth="6" 
                      strokeDasharray={2 * Math.PI * 30}
                      strokeDashoffset={(2 * Math.PI * 30) - (profitMargin / 100) * (2 * Math.PI * 30)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xs font-black text-slate-800">{profitMargin}%</span>
                    <span className="text-[7px] font-bold text-slate-400 block uppercase leading-none">Net Retention</span>
                  </div>
                </div>
              </div>

              {/* Bar 2: Expense */}
              <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                <span className="text-[10px] font-black text-rose-600">
                  {isMounted ? globalTotalExpense.toLocaleString() : "0"} ฿
                </span>
                <div 
                  className="w-12 bg-rose-400 rounded-t-xl transition-all duration-1000 shadow-md shadow-rose-400/10 min-h-[12px]"
                  style={{
                    height: `${globalTotalIncome === 0 ? 5 : (globalTotalExpense / (globalTotalIncome || 1)) * 90}%`
                  }}
                />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">รายจ่ายทั้งหมด</span>
              </div>

            </div>
          </div>

          <div className="mt-4 text-[10px] font-bold text-slate-400 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            💡 **วิเคราะห์:** คุณรักษากำไรได้คิดเป็นสถิติสูงสุดถึง **{profitMargin}%** ถือว่ามีความเสถียรทางการเงินในระดับดีเยี่ยม และสภาพคล่องสะสมในระบบอยู่ที่ **{(globalTotalIncome - globalTotalExpense).toLocaleString()} ฿**
          </div>
        </div>

        {/* Business Unit breakdown list (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
          <div className="mb-4">
            <h3 className="text-sm font-extrabold text-slate-800">วิเคราะห์ตามประเภทหน่วยธุรกิจ</h3>
            <span className="text-[10px] text-slate-400 font-bold">สรุปยอดบัญชีแยกตามแผนกงานที่ลงทะเบียน</span>
          </div>

          <div className="space-y-3 max-h-[265px] overflow-y-auto pr-1">
            {summary?.units.map((u) => {
              const totalAmount = u.total_income + u.total_expense;
              const incomePct = totalAmount > 0 ? Math.round((u.total_income / totalAmount) * 100) : 0;
              return (
                <div key={u.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        u.type === 'DORMITORY' ? 'bg-blue-500' :
                        u.type === 'GARAGE' ? 'bg-orange-500' : 'bg-amber-500'
                      }`} />
                      {u.name}
                    </span>
                    <span className={`text-xs font-black ${u.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {u.balance >= 0 ? "+" : ""}{u.balance.toLocaleString()} ฿
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <span>รับ: {u.total_income.toLocaleString()} ฿</span>
                    <span>จ่าย: {u.total_expense.toLocaleString()} ฿</span>
                  </div>

                  {/* Micro horizontal bar comparing Income vs Expense of this Unit */}
                  <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${incomePct}%` }}
                    />
                    <div 
                      className="bg-rose-400 h-full transition-all"
                      style={{ width: `${100 - incomePct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {(!summary?.units || summary.units.length === 0) && (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                ไม่มีข้อมูลยอดรายหน่วยธุรกิจ
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- Filter & Searching Subsystem --- */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-800">📄 สมุดบัญชีรายการเดินเงิน (General Ledger)</span>
            <span className="text-[10px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">
              พบ {processedTransactions.length} รายการ
            </span>
          </div>
          <button
            onClick={() => {
              const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
              const a = document.createElement("a");
              a.href = `${API_BASE}/transactions/export/excel`;
              a.download = "transactions.xlsx";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            📥 ส่งออก Excel
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-bold">คัดกรอง ค้นหา และจัดเรียง</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-7 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 lg:col-span-2 relative">
            <span className="absolute left-3.5 top-3 text-xs">🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วยรายละเอียด หรือ ธุรกิจ..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none text-xs font-semibold"
            />
          </div>

          {/* Date Range Start */}
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">เริ่มวันที่</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition outline-none text-[10px] font-bold"
            />
          </div>

          {/* Date Range End */}
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">ถึงวันที่</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition outline-none text-[10px] font-bold"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none text-xs font-black cursor-pointer"
            >
              <option value="all">📁 ทุกประเภท</option>
              <option value={TransactionType.INCOME}>📈 รายรับ</option>
              <option value={TransactionType.EXPENSE}>📉 รายจ่าย</option>
            </select>
          </div>

          {/* Business Unit Filter */}
          <div>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none text-xs font-black cursor-pointer"
            >
              <option value="all">🏢 ทุกธุรกิจ</option>
              {filterUnitOptions.map(name => (
                <option key={name} value={name}>🏢 {name}</option>
              ))}
              <option value="general">⚙️ ทั่วไป</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none text-xs font-black cursor-pointer"
            >
              <option value="newest">📅 ล่าสุด</option>
              <option value="oldest">📅 นานสุด</option>
              <option value="highest">💰 สูง-ต่ำ</option>
              <option value="lowest">💰 ต่ำ-สูง</option>
            </select>
          </div>
        </div>

        {/* Dynamic statistics based on search filters */}
        {(filterType !== "all" || filterUnit !== "all" || searchTerm || startDate || endDate) && (
          <div className="flex flex-wrap gap-4 text-xs font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400">📊 ผลรวมการกรอง:</span>
            <span className="text-emerald-600">รายรับ: +{filteredIncome.toLocaleString()} ฿</span>
            <span className="text-rose-600">รายจ่าย: -{filteredExpense.toLocaleString()} ฿</span>
            <span className="text-indigo-600">คงเหลือสุทธิ: {(filteredIncome - filteredExpense).toLocaleString()} ฿</span>
            <button 
              onClick={() => { setFilterType("all"); setFilterUnit("all"); setSearchTerm(""); setStartDate(""); setEndDate(""); setSortBy("newest"); }}
              className="ml-auto text-indigo-600 hover:underline cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด 🔄
            </button>
          </div>
        )}

      </div>

      {/* --- Main General Ledger Table --- */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">วัน-เวลาบันทึก</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">สังกัดแผนกธุรกิจ</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">รายละเอียด</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">จำนวนเงินสุทธิ</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">ประเภทบัญชี</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-extrabold text-slate-400">กำลังเชื่อมโยงฐานข้อมูลการเงิน...</span>
                    </div>
                  </td>
                </tr>
              ) : processedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <span className="text-5xl">📁</span>
                      <span className="text-sm font-black text-slate-400">ไม่พบรายการทางการเงินตามตัวคัดกรอง</span>
                      <button 
                        onClick={() => { setFilterType("all"); setFilterUnit("all"); setSearchTerm(""); }}
                        className="text-xs font-bold text-indigo-500 hover:underline mt-2 cursor-pointer"
                      >
                        ล้างการกรองเพื่อลองใหม่
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                processedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition duration-150 group">
                    
                    {/* Timestamp */}
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-extrabold text-slate-700">
                        {new Date(t.created_at).toLocaleDateString("th-TH", { day: '2-digit', month: 'short', year: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {new Date(t.created_at).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })} น.
                      </div>
                    </td>

                    {/* Business Unit Tag */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          t.unit?.type === 'DORMITORY' ? 'bg-blue-500 animate-pulse' :
                          t.unit?.type === 'GARAGE' ? 'bg-orange-500' :
                          t.unit?.type === 'HOUSE' ? 'bg-amber-500' : 'bg-slate-300'
                        }`} />
                        <span className="text-xs font-black text-slate-700">{t.unit?.name || "ทั่วไป (ไม่มีสังกัด)"}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold ml-4.5 uppercase tracking-tighter">
                        {t.unit?.type || "General Overhead"}
                      </div>
                    </td>

                    {/* Ledger description */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                        {t.description}
                      </div>
                    </td>

                    {/* Transaction Amount */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-black ${t.type === TransactionType.INCOME ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.type === TransactionType.INCOME ? "+" : "-"}
                        {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-[10px] ml-0.5">฿</span>
                      </div>
                    </td>

                    {/* Visual Badge Type */}
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase inline-block ${
                        t.type === TransactionType.INCOME 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}>
                        {t.type === TransactionType.INCOME ? "📥 รายรับ" : "📤 รายจ่าย"}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Visual Flowchart Map Info Segment --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/60 p-5 rounded-3xl mt-6">
        <div>
          <h4 className="text-xs font-extrabold text-slate-800 mb-1">💡 เคล็ดลับการรวบรวมบัญชีอัจฉริยะ</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
            ระบบสามารถรวบรวมข้อมูลผ่านระบบ LINE Chatbot ได้ทันที! เมื่อเจ้าหน้าที่พิมพ์เช่น <span className="text-indigo-600">&quot;รับ 5000 ค่ามัดจำอู่ซ่อมรถ&quot;</span> หรือ <span className="text-rose-600">&quot;จ่าย 1500 ค่าน้ำประปาหอพัก&quot;</span> ระบบ AI จะตัดประเภทและวิเคราะห์หาธุรกิจที่เหมาะสมและบันทึกสถิติแบบ Realtime โดยอัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg">💡</div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 mb-0.5">การเชื่อมโยงงบการเงิน</h4>
            <p className="text-[10px] text-slate-400 font-bold leading-normal">
              ทุกครั้งที่มีการกดออกใบเสร็จหรือเก็บค่าเช่าในระบบหอพัก ระบบจะบันทึกรายการรายรับสุทธิเข้ามายังประวัติบัญชีการเงินหน้านี้ให้อัตโนมัติ ป้องกันข้อมูลตกหล่น 100%
            </p>
          </div>
        </div>
      </div>

      {/* --- ADD TRANSACTION MODAL DIALOG --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 lg:p-7 max-w-md w-full border border-slate-100 shadow-2xl relative my-auto animate-[scaleUp_0.2s_ease-out] space-y-4">
            
            {/* Modal Header */}
            <div>
              <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                <span>📝 บันทึกรายการรายรับ - รายจ่ายใหม่</span>
              </h3>
              <p className="text-slate-400 text-[10px] font-bold">กรอกข้อมูลเพื่อลงบันทึกในสมุดบัญชีแยกประเภทระบบและวิเคราะห์กระแสเงินสด</p>
            </div>

            {/* Close Cross */}
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-150 p-1.5 rounded-lg cursor-pointer transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-4 pt-2">
              
              {/* Field 1: Transaction Type Segmented Pills */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ประเภทบัญชี</label>
                <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => setNewTxType(TransactionType.INCOME)}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      newTxType === TransactionType.INCOME
                        ? "bg-emerald-600 text-white shadow font-extrabold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>📥</span>
                    <span>บันทึกรายรับ (Income)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTxType(TransactionType.EXPENSE)}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      newTxType === TransactionType.EXPENSE
                        ? "bg-rose-600 text-white shadow font-extrabold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>📤</span>
                    <span>บันทึกรายจ่าย (Expense)</span>
                  </button>
                </div>
              </div>

              {/* Field 2: Amount (฿) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">จำนวนเงิน (บาท)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newTxAmount}
                    onChange={(e) => setNewTxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-black text-slate-800"
                  />
                  <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">THB ฿</span>
                </div>
              </div>

              {/* Field 3: Business Unit Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">แผนกงาน/ธุรกิจที่เกี่ยวข้อง</label>
                <select
                  value={newTxUnitId}
                  onChange={(e) => setNewTxUnitId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="general">⚙️ ส่วนกลางทั่วไป / โสหุ้ยระบบ (General Overhead)</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id.toString()}>
                      🏢 {unit.name} ({unit.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 4: Description */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">รายละเอียดธุรกรรม</label>
                <input
                  type="text"
                  required
                  value={newTxDesc}
                  onChange={(e) => setNewTxDesc(e.target.value)}
                  placeholder="ตัวอย่างเช่น: ค่าเช่าห้อง 201, ซ่อมประตูตึกบี, จ่ายค่าน้ำ"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-xs font-semibold text-slate-800"
                  list="common-descriptions"
                />
                <datalist id="common-descriptions">
                  <option value="ค่าเช่าห้องพักประจำเดือน" />
                  <option value="ค่าน้ำประปาและค่าไฟฟ้าหอพัก" />
                  <option value="ค่าบริการอู่ซ่อมรถ" />
                  <option value="ค่าแรงแรงงานพนักงานประจำสัปดาห์" />
                  <option value="ค่าบำรุงรักษาซ่อมแซมอาคาร" />
                  <option value="ซื้อวัสดุอุปกรณ์ทำความสะอาด" />
                  <option value="ค่าบริหารจัดการขยะส่วนกลาง" />
                </datalist>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>💾 บันทึกบัญชี</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
