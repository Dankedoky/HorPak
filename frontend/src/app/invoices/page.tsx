"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  fetchInvoices, 
  fetchCustomers, 
  fetchUnits, 
  createInvoice, 
  updateInvoiceStatus,
  updateInvoice,
  deleteInvoice
} from "@/lib/api";
import PromptPayQRCard from "../PromptPayQRCard";

interface Customer {
  id: number;
  name: string;
  phone?: string;
  line_user_id?: string;
}

interface BusinessUnit {
  id: number;
  name: string;
  type: string;
}

interface Invoice {
  id: number;
  title: string;
  amount: number;
  status: "paid" | "unpaid" | "cancelled";
  created_at: string;
  due_date?: string;
  customer_id: number;
  unit_id: number;
  customer?: Customer;
  unit?: BusinessUnit;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter and Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid" | "cancelled">("all");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  // Modal Dialog States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Create Invoice Form States
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newUnitId, setNewUnitId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newStatus, setNewStatus] = useState<"paid" | "unpaid">("unpaid");

  // Edit Invoice Form States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editUnitId, setEditUnitId] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<"paid" | "unpaid" | "cancelled">("unpaid");

  // Toast States
  const [toastMsg, setToastMsg] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invList, custList, unitList] = await Promise.all([
        fetchInvoices(),
        fetchCustomers(),
        fetchUnits()
      ]);
      setInvoices(invList || []);
      setCustomers(custList || []);
      setUnits(unitList || []);
      setError(null);
    } catch (err: unknown) {
      console.error(err);
      setError("ไม่สามารถดึงข้อมูลใบแจ้งหนี้ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      loadData();
    }, 0);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // Submit Handler for Creating Invoice
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount);
    if (!newTitle.trim()) return alert("กรุณากรอกชื่อรายการแจ้งหนี้");
    if (isNaN(amount) || amount <= 0) return alert("กรุณาระบุจำนวนเงินที่ถูกต้อง");
    if (!newCustomerId) return alert("กรุณาเลือกผู้เช่า/ลูกค้าผู้ชำระเงิน");
    if (!newUnitId) return alert("กรุณาเลือกประเภทหน่วยธุรกิจ");

    setIsSubmitting(true);
    try {
      await createInvoice({
        title: newTitle.trim(),
        amount: amount,
        status: newStatus,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        customer_id: parseInt(newCustomerId),
        unit_id: parseInt(newUnitId)
      });

      triggerToast("🎉 สร้างและออกใบแจ้งหนี้ใหม่สำเร็จแล้ว!");
      
      // Clear values & close modal
      setNewTitle("");
      setNewAmount("");
      setNewCustomerId("");
      setNewUnitId("");
      setNewDueDate("");
      setNewStatus("unpaid");
      setShowCreateModal(false);

      await loadData();
    } catch (err: any) {
      alert("ไม่สามารถบันทึกข้อมูลใบแจ้งหนี้ได้: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (inv: Invoice) => {
    setEditInvoiceId(inv.id);
    setEditTitle(inv.title);
    setEditAmount(inv.amount.toString());
    setEditCustomerId(inv.customer_id.toString());
    setEditUnitId(inv.unit_id.toString());
    setEditDueDate(inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : "");
    setEditStatus(inv.status);
    setShowEditModal(true);
  };

  const handleEditInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInvoiceId) return;
    const amount = parseFloat(editAmount);
    if (!editTitle.trim()) return alert("กรุณากรอกชื่อรายการแจ้งหนี้");
    if (isNaN(amount) || amount <= 0) return alert("กรุณาระบุจำนวนเงินที่ถูกต้อง");
    if (!editCustomerId) return alert("กรุณาเลือกผู้เช่า/ลูกค้าผู้ชำระเงิน");
    if (!editUnitId) return alert("กรุณาเลือกประเภทหน่วยธุรกิจ");

    setIsSubmitting(true);
    try {
      const updated = await updateInvoice(editInvoiceId, {
        title: editTitle.trim(),
        amount: amount,
        status: editStatus,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
        customer_id: parseInt(editCustomerId),
        unit_id: parseInt(editUnitId)
      });

      triggerToast("🎉 แก้ไขรายละเอียดใบแจ้งหนี้สำเร็จแล้ว!");
      
      if (selectedInvoice && selectedInvoice.id === editInvoiceId) {
        setSelectedInvoice({
          ...selectedInvoice,
          title: updated.title,
          amount: updated.amount,
          status: updated.status,
          due_date: updated.due_date,
          customer_id: updated.customer_id,
          unit_id: updated.unit_id,
          customer: customers.find(c => c.id === updated.customer_id),
          unit: units.find(u => u.id === updated.unit_id)
        });
      }

      setShowEditModal(false);
      await loadData();
    } catch (err: any) {
      alert("ไม่สามารถอัปเดตข้อมูลใบแจ้งหนี้ได้: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งหนี้รายการนี้?\nการลบใบแจ้งหนี้จะย้อนกลับรายการบัญชี/ลบรายการเดินเงินที่เชื่อมโยงโดยอัตโนมัติ เพื่อป้องกันการบันทึกงบการเงินซ้ำซ้อน")) return;
    
    try {
      await deleteInvoice(invoiceId);
      triggerToast("🗑️ ลบใบแจ้งหนี้ออกจากระบบเรียบร้อยแล้ว!");
      setSelectedInvoice(null);
      await loadData();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการลบบิล: " + err.message);
    }
  };

  // Status Updater Handler
  const handleUpdateStatus = async (invoiceId: number, status: "paid" | "unpaid" | "cancelled") => {
    try {
      const updated = await updateInvoiceStatus(invoiceId, status);
      
      // Update local listing
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: updated.status } : inv));
      
      // Sync selected modal details
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(prev => prev ? { ...prev, status: updated.status } : null);
      }

      triggerToast(`💸 อัปเดตสถานะบิล ID: ${invoiceId} เป็น "${status === 'paid' ? 'ชำระเงินแล้ว' : status === 'cancelled' ? 'ยกเลิกบิล' : 'ค้างชำระ'}" เรียบร้อย!`);
      loadData();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะบิล: " + err.message);
    }
  };

  // Processed list based on Filters, Search, and Sorts
  const processedInvoices = useMemo(() => {
    const result = invoices.filter((inv) => {
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      const matchUnit = filterUnit === "all" || inv.unit?.name === filterUnit;
      const matchSearch = inv.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (inv.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (inv.unit?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchUnit && matchSearch;
    });

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
  }, [invoices, filterStatus, filterUnit, searchTerm, sortBy]);

  // Invoice dynamic calculations
  const stats = useMemo(() => {
    const gross = processedInvoices.reduce((sum, inv) => sum + (inv.status !== 'cancelled' ? inv.amount : 0), 0);
    const collected = processedInvoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.amount : 0), 0);
    const outstanding = processedInvoices.reduce((sum, inv) => sum + (inv.status === 'unpaid' ? inv.amount : 0), 0);
    const efficiency = gross > 0 ? Math.round((collected / gross) * 100) : 0;
    
    return { gross, collected, outstanding, efficiency };
  }, [processedInvoices]);

  // Printer logic
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Toast HUD */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 z-50 flex items-center gap-2 text-xs font-black animate-[slideUp_0.3s_ease-out]">
          <span>📄</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-2 inline-block">
            🧾 billing statements Hub
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>การแจ้งหนี้และใบเสร็จ</span>
            <span className="text-xs bg-emerald-50 text-emerald-600 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">พร้อมเชื่อมระบบ LINE</span>
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">ควบคุมบิลค่าเช่าหอพัก ใบแจ้งหนี้ของอู่ซ่อมรถ และบ้านเช่า เพื่อส่งเรียกเก็บเงินผ่าน LINE ทันที</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={loadData}
            className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition shadow-sm cursor-pointer"
            title="อัปเดตข้อมูลบิลล่าสุด"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <span>➕</span>
            <span>สร้างใบแจ้งหนี้ใหม่</span>
          </button>
        </div>
      </div>

      {/* Invoices KPI stats summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sum invoiced */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-xl text-blue-600">
            📊
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ยอดแจ้งหนี้สะสม</span>
            <div className="text-lg font-black text-slate-800 tracking-tight mt-0.5">
              {stats.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-[10px] font-extrabold text-slate-400 ml-0.5">฿</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400">
              ไม่รวมบิลที่ยกเลิกสะสม
            </span>
          </div>
        </div>

        {/* Total collected */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl text-emerald-600">
            🟢
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ยอดเงินชำระแล้ว</span>
            <div className="text-lg font-black text-emerald-600 tracking-tight mt-0.5">
              {stats.collected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-[10px] font-extrabold text-emerald-400 ml-0.5">฿</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400">
              ตัดยอดเป็นรายรับสมุดบัญชีแล้ว
            </span>
          </div>
        </div>

        {/* Total outstanding */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-xl text-rose-600">
            🔴
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ยอดค้างจ่าย (A/R)</span>
            <div className="text-lg font-black text-rose-600 tracking-tight mt-0.5">
              {stats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-[10px] font-extrabold text-rose-400 ml-0.5">฿</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400">
              ค้างชำระรอการติดตามบิล
            </span>
          </div>
        </div>

        {/* Efficiency percentage */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl text-indigo-600">
            🎯
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">อัตราจัดเก็บหนี้</span>
            <div className="text-lg font-black text-slate-800 tracking-tight mt-0.5">
              {stats.efficiency}
              <span className="text-[10px] font-extrabold text-slate-400 ml-0.5">%</span>
            </div>
            <span className="text-[9px] font-bold text-indigo-500">
              สัดส่วนบิลที่เก็บเงินสำเร็จ
            </span>
          </div>
        </div>
      </div>

      {/* Filters Hub Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-800">📄 รายการบิลแจ้งหนี้ในระบบทั้งหมด</span>
            <span className="text-[10px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">
              พบ {processedInvoices.length} บิล
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">คัดกรอง ค้นหา และพิมพ์รายงาน</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <span className="absolute left-3.5 top-3 text-xs">🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาบิลด้วยชื่อรายการ หรือชื่อผู้พักอาศัย..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs font-semibold"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs font-black cursor-pointer"
            >
              <option value="all">📁 ทุกสถานะชำระบิล</option>
              <option value="paid">🟢 ชำระแล้ว (Paid)</option>
              <option value="unpaid">🔴 ค้างจ่าย (Unpaid)</option>
              <option value="cancelled">⚪ ยกเลิกบิล (Cancelled)</option>
            </select>
          </div>

          {/* Business Unit Filter */}
          <div>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs font-black cursor-pointer"
            >
              <option value="all">🏢 ทุกประเภทธุรกิจ</option>
              {units.map(u => (
                <option key={u.id} value={u.name}>🏢 {u.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs font-black cursor-pointer"
            >
              <option value="newest">📅 วันที่ออกบิล: ล่าสุด</option>
              <option value="oldest">📅 วันที่ออกบิล: นานสุด</option>
              <option value="highest">💰 ยอดเงินบิล: สูง - ต่ำ</option>
              <option value="lowest">💰 ยอดเงินบิล: ต่ำ - สูง</option>
            </select>
          </div>
        </div>

        {/* Live Filter Indicator Statistics */}
        {(filterStatus !== "all" || filterUnit !== "all" || searchTerm) && (
          <div className="flex flex-wrap gap-4 text-xs font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400">📊 ผลกรองบิลเฉพาะจุด:</span>
            <span className="text-blue-600">บิลรวม: {stats.gross.toLocaleString()} ฿</span>
            <span className="text-emerald-600">ชำระแล้ว: {stats.collected.toLocaleString()} ฿</span>
            <span className="text-rose-600">คงค้างหนี้: {stats.outstanding.toLocaleString()} ฿</span>
            <button 
              onClick={() => { setFilterStatus("all"); setFilterUnit("all"); setSearchTerm(""); setSortBy("newest"); }}
              className="ml-auto text-blue-600 hover:underline cursor-pointer"
            >
              ล้างตัวกรองสะสม 🔄
            </button>
          </div>
        )}

      </div>

      {/* Main invoices table ledger representation */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">วันเวลาที่ออกบิล</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">สังกัดธุรกิจ</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">ชื่อใบแจ้งหนี้ / ผู้พักอาศัย</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">จำนวนเงินแจ้งจ่าย</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">สถานะชำระบิล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-400">กำลังเชื่อมฐานข้อมูลใบแจ้งหนี้ของระบบ...</span>
                    </div>
                  </td>
                </tr>
              ) : processedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <span className="text-5xl">📄</span>
                      <span className="text-sm font-black text-slate-400">ไม่พบข้อมูลบิลเรียกเก็บเงิน</span>
                      <button 
                        onClick={() => { setFilterStatus("all"); setFilterUnit("all"); setSearchTerm(""); }}
                        className="text-xs font-bold text-blue-500 hover:underline mt-2 cursor-pointer"
                      >
                        ดูรายการทั้งหมด
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                processedInvoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-slate-50/80 transition duration-150 group cursor-pointer"
                  >
                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-extrabold text-slate-700">
                        {new Date(inv.created_at).toLocaleDateString("th-TH", { day: '2-digit', month: 'short', year: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {new Date(inv.created_at).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })} น.
                      </div>
                    </td>

                    {/* Unit Tag */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          inv.unit?.type === 'DORMITORY' ? 'bg-blue-500' :
                          inv.unit?.type === 'GARAGE' ? 'bg-orange-500' : 'bg-amber-500'
                        }`} />
                        <span className="text-xs font-black text-slate-700">{inv.unit?.name || "ไม่ระบุธุรกิจ"}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold ml-4.5 uppercase tracking-tighter">
                        {inv.unit?.type || "N/A"}
                      </div>
                    </td>

                    {/* Title / Customer */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {inv.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                        <span>👤 ผู้จ่าย:</span>
                        <span className="text-slate-600">{inv.customer?.name || "—"}</span>
                        {inv.customer?.phone && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded border border-slate-200/50">
                            📞 {inv.customer.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-slate-800">
                        {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-400 ml-0.5">฿</span>
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={inv.status}
                        onChange={(e) => handleUpdateStatus(inv.id, e.target.value as any)}
                        className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase text-center border focus:ring-1 focus:ring-slate-300 outline-none cursor-pointer transition ${
                          inv.status === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                          inv.status === 'cancelled' ? 'bg-slate-100 border-slate-200 text-slate-400' :
                          'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'
                        }`}
                      >
                        <option value="unpaid">🔴 ค้างชำระ</option>
                        <option value="paid">🟢 ชำระแล้ว</option>
                        <option value="cancelled">⚪ ยกเลิกบิล</option>
                      </select>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE NEW INVOICE DIALOG --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 lg:p-7 max-w-md w-full border border-slate-100 shadow-2xl relative my-auto animate-[scaleUp_0.2s_ease-out] space-y-4">
            
            {/* Modal Header */}
            <div>
              <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                <span>📝 บันทึกออกบิลและใบแจ้งหนี้ใหม่</span>
              </h3>
              <p className="text-slate-400 text-[10px] font-bold">ออกเอกสารการเรียกเก็บเงินและเตรียมลิงก์ส่งค้างชำระไปยังเบอร์และ LINE ลูกค้า</p>
            </div>

            {/* Close cross */}
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-5 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 pt-2">
              
              {/* Title */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ชื่อรายการออกบิล</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น: ค่าเช่าห้อง 302, ค่าเปลี่ยนถ่ายน้ำมันเครื่องรถตู้"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ยอดเงินเรียกเก็บ (บาท)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-black text-slate-800"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">THB ฿</span>
                </div>
              </div>

              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ลูกค้าผู้จ่ายเงิน</label>
                <select
                  required
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">— กรุณาเลือกผู้พักอาศัย/ลูกค้าในระบบ —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id.toString()}>👤 {c.name} {c.phone ? `(${c.phone})` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Business Unit Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ออกในนามธุรกิจ</label>
                <select
                  required
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">— กรุณาเลือกธุรกิจ —</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id.toString()}>🏢 {u.name} ({u.type})</option>
                  ))}
                </select>
              </div>

              {/* Grid: Due Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">วันสิ้นสุดบิล</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[10px] font-semibold text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">สถานะเริ่มต้น</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="unpaid">🔴 ค้างชำระ</option>
                    <option value="paid">🟢 ชำระเงินแล้ว</option>
                  </select>
                </div>
              </div>

              {/* Submit / Cancel buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-600/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>💾 ออกใบแจ้งหนี้</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- EDIT INVOICE DIALOG --- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 lg:p-7 max-w-md w-full border border-slate-100 shadow-2xl relative my-auto animate-[scaleUp_0.2s_ease-out] space-y-4">
            
            {/* Modal Header */}
            <div>
              <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                <span>✏️ แก้ไขบิลและใบแจ้งหนี้</span>
              </h3>
              <p className="text-slate-400 text-[10px] font-bold">แก้ไขข้อมูลการเรียกเก็บเงินและวันสิ้นสุดของบิลรายการนี้</p>
            </div>

            {/* Close cross */}
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-5 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <form onSubmit={handleEditInvoiceSubmit} className="space-y-4 pt-2">
              
              {/* Title */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ชื่อรายการออกบิล</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="เช่น: ค่าเช่าห้อง 302, ค่าเปลี่ยนถ่ายน้ำมันเครื่องรถตู้"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ยอดเงินเรียกเก็บ (บาท)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-black text-slate-800"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">THB ฿</span>
                </div>
              </div>

              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ลูกค้าผู้จ่ายเงิน</label>
                <select
                  required
                  value={editCustomerId}
                  onChange={(e) => setEditCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">— กรุณาเลือกผู้พักอาศัย/ลูกค้าในระบบ —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id.toString()}>👤 {c.name} {c.phone ? `(${c.phone})` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Business Unit Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">ออกในนามธุรกิจ</label>
                <select
                  required
                  value={editUnitId}
                  onChange={(e) => setEditUnitId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">— กรุณาเลือกธุรกิจ —</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id.toString()}>🏢 {u.name} ({u.type})</option>
                  ))}
                </select>
              </div>

              {/* Grid: Due Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">วันสิ้นสุดบิล</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-[10px] font-semibold text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">สถานะบิล</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="unpaid">🔴 ค้างชำระ</option>
                    <option value="paid">🟢 ชำระเงินแล้ว</option>
                    <option value="cancelled">⚫ ยกเลิกบิล</option>
                  </select>
                </div>
              </div>

              {/* Submit / Cancel buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-600/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>💾 บันทึกการแก้ไข</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- PREMIUM TAX INVOICE / RECEIPT VIEWER MODAL (ใบเสร็จรับเงิน/ใบกำกับภาษี) --- */}
      {selectedInvoice && (() => {
        const inv = selectedInvoice;
        const subtotal = inv.amount / 1.07;
        const vat = inv.amount - subtotal;
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-6 overflow-y-auto print:p-0 print:bg-white print:relative animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-3xl p-6 lg:p-10 max-w-2xl w-full border border-slate-100 shadow-2xl relative my-auto max-h-[95vh] overflow-y-auto print:max-h-full print:shadow-none print:border-none print:overflow-visible animate-[scaleUp_0.2s_ease-out] print:p-0 print:my-0 space-y-6">
              
              {/* Close & Action Buttons (Hidden in print) */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
                <div className="flex gap-2">
                  {inv.status === "unpaid" && (
                    <button
                      onClick={() => setShowQRModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black transition cursor-pointer shadow-sm shadow-blue-500/20 active:scale-95"
                    >
                      <span>📲</span>
                      <span>สแกนจ่าย PromptPay</span>
                    </button>
                  )}
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold transition cursor-pointer"
                  >
                    <span>🖨️</span>
                    <span>พิมพ์ใบกำกับภาษี (Print)</span>
                  </button>
                  <button
                    onClick={() => {
                      const nextStatus = inv.status === "paid" ? "unpaid" : "paid";
                      handleUpdateStatus(inv.id, nextStatus);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-extrabold transition cursor-pointer ${
                      inv.status === "paid"
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100"
                    }`}
                  >
                    <span>💸</span>
                    <span>{inv.status === "paid" ? "เปลี่ยนเป็นค้างชำระ" : "ทำเครื่องหมายว่าจ่ายแล้ว"}</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(inv)}
                    className="flex items-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-xl text-[10px] font-black transition cursor-pointer active:scale-95"
                  >
                    <span>✏️</span>
                    <span>แก้ไขบิล</span>
                  </button>
                  <button
                    onClick={() => handleDeleteInvoice(inv.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-black transition cursor-pointer active:scale-95"
                  >
                    <span>🗑️</span>
                    <span>ลบบิล</span>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* --- PRINTABLE RECEIPT CONTAINER --- */}
              <div className="space-y-6 text-slate-800 print:text-black">
                
                {/* 1. Header Segment (Logo & Details) */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm print:bg-black">SV</span>
                      <h2 className="text-md font-black tracking-tight text-slate-800 print:text-black">บริษัท ซอฟเวอเรน โวลต์ จำกัด</h2>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-bold max-w-sm">
                      เลขที่ 26/20 ถ.รามอินทรา แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพมหานคร 10220<br />
                      เลขประจำตัวผู้เสียภาษีอากร: 0105569000123 (สำนักงานใหญ่)
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <h1 className="text-base font-black text-blue-600 tracking-wider print:text-black">
                      {inv.status === "paid" ? "ใบเสร็จรับเงิน / ใบกำกับภาษี" : "ใบแจ้งหนี้ / ใบเรียกเก็บเงิน"}
                    </h1>
                    <p className="text-[10px] font-black text-slate-400">RECEIPT / TAX INVOICE</p>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-left text-[9px] font-bold space-y-0.5 inline-block print:bg-white print:border-black">
                      <div><span className="text-slate-400">เลขที่บิล / No:</span> <span className="text-slate-800 print:text-black font-black">INV-{String(inv.id).padStart(5, '0')}</span></div>
                      <div><span className="text-slate-400">วันที่ออก / Date:</span> <span className="text-slate-800 print:text-black">{new Date(inv.created_at).toLocaleDateString("th-TH")}</span></div>
                      {inv.due_date && <div><span className="text-slate-400">กำหนดชำระ / Due:</span> <span className="text-slate-800 print:text-black">{new Date(inv.due_date).toLocaleDateString("th-TH")}</span></div>}
                    </div>
                  </div>
                </div>

                {/* 2. Client Billing Details */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-150 print:bg-white print:border-black">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">ลูกค้าผู้พักอาศัย / CLIENT:</span>
                    <span className="text-xs font-black text-slate-800 print:text-black block mt-0.5">{inv.customer?.name || "ไม่ระบุ"}</span>
                    {inv.customer?.phone && <span className="text-[10px] text-slate-500 block">โทรศัพท์: {inv.customer.phone}</span>}
                    {inv.customer?.line_user_id && <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded mt-1 inline-block border border-slate-200/50">LINE Connected ✅</span>}
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">หน่วยงานผู้เรียกเก็บ / DEPT:</span>
                    <span className="text-xs font-black text-slate-800 print:text-black block mt-0.5">แผนก: {inv.unit?.name || "ส่วนกลาง"}</span>
                    <span className="text-[10px] text-slate-500 block">หมวดธุรกิจ: {inv.unit?.type || " Overheads"}</span>
                    <span className="text-[9px] text-slate-400 block mt-1">รับชำระผ่าน: บัญชีธนาคารกสิกรไทย 012-3-45678-9</span>
                  </div>
                </div>

                {/* 3. Items Breakdown Table */}
                <table className="w-full text-left border-collapse border-b border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 print:bg-white print:border-black">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">รายการและรายละเอียดสินค้า / Description</th>
                      <th className="py-2.5 px-3 text-right">ราคาต่อหน่วย</th>
                      <th className="py-2.5 px-3 text-right">จำนวน</th>
                      <th className="py-2.5 px-3 text-right">ยอดเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-xs font-semibold border-b border-slate-100">
                      <td className="py-4 px-3 text-slate-400">1</td>
                      <td className="py-4 px-3">
                        <div className="font-extrabold text-slate-800 print:text-black">{inv.title}</div>
                        <div className="text-[9px] text-slate-400">ชำระผ่านช่องทางเรียกเก็บเงินหน่วยงาน {inv.unit?.name}</div>
                      </td>
                      <td className="py-4 px-3 text-right">{inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-3 text-right">1</td>
                      <td className="py-4 px-3 text-right font-black">{inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 4. VAT & Summary calculations */}
                <div className="flex justify-between items-start pt-2 gap-4">
                  
                  {/* Status Stamp */}
                  <div className="relative">
                    {inv.status === "paid" ? (
                      <div className="border-[3px] border-emerald-500/80 rounded-2xl px-5 py-2 text-emerald-500/85 font-black text-sm tracking-widest uppercase rotate-[-6deg] animate-pulse print:border-black print:text-black">
                        ชำระเงินแล้ว ✅<br />
                        <span className="text-[9px] font-bold block text-center mt-0.5">PAID STAMP</span>
                      </div>
                    ) : inv.status === "cancelled" ? (
                      <div className="border-[3px] border-slate-400/80 rounded-2xl px-5 py-2 text-slate-400/85 font-black text-sm tracking-widest uppercase rotate-[-6deg] print:border-black print:text-black">
                        ยกเลิกบิล ⚪<br />
                        <span className="text-[9px] font-bold block text-center mt-0.5">CANCELLED</span>
                      </div>
                    ) : (
                      <div className="border-[3px] border-rose-500/80 rounded-2xl px-5 py-2 text-rose-500/85 font-black text-sm tracking-widest uppercase rotate-[-6deg] print:border-black print:text-black">
                        ค้างชำระ ❌<br />
                        <span className="text-[9px] font-bold block text-center mt-0.5">UNPAID</span>
                      </div>
                    )}
                  </div>

                  {/* Calculations */}
                  <div className="w-64 space-y-1.5 text-xs font-bold text-slate-600 print:text-black">
                    <div className="flex justify-between">
                      <span className="text-slate-400">มูลค่าก่อนภาษี (Subtotal)</span>
                      <span>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                      <span>{vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 text-slate-800 print:text-black">
                      <span className="text-sm font-black">ยอดเงินรวมสุทธิ (Grand Total)</span>
                      <span className="text-base font-black text-blue-600 print:text-black">
                        {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Printable Footer segment signatures */}
                <div className="grid grid-cols-2 gap-8 pt-10 border-t border-dashed border-slate-200">
                  <div className="text-center space-y-4">
                    <div className="h-10 flex items-end justify-center">
                      <span className="text-[10px] text-slate-300 font-bold border-b border-slate-200 w-32 block"></span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-500 block">ผู้รับเงิน / Collector Signature</span>
                      <span className="text-[9px] text-slate-400 font-medium">วันที่ / Date: _____/_____/_____</span>
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <div className="h-10 flex items-end justify-center">
                      <span className="text-[10px] text-slate-300 font-bold border-b border-slate-200 w-32 block"></span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-500 block">ผู้จ่ายเงิน / Client Signature</span>
                      <span className="text-[9px] text-slate-400 font-medium">วันที่ / Date: _____/_____/_____</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {showQRModal && selectedInvoice && (
        <PromptPayQRCard
          amount={selectedInvoice.amount}
          title={`ชำระบิล: ${selectedInvoice.title} (เลขที่: INV-${String(selectedInvoice.id).padStart(5, '0')})`}
          type="invoice"
          targetId={String(selectedInvoice.id)}
          onClose={() => setShowQRModal(false)}
          onSuccess={() => {
            handleUpdateStatus(selectedInvoice.id, "paid");
            setShowQRModal(false);
          }}
        />
      )}

    </div>
  );
}
