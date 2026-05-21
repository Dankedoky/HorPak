"use client";

import { useState, useEffect } from "react";
import { fetchRentalHouses, updateRentalHouse, fetchHousePayments, createRentalHouse, deleteRentalHouse } from "@/lib/api";
import PromptPayQRCard from "../PromptPayQRCard";

interface RentalHouse {
  id: string;
  name: string;
  tenantName: string;
  monthlyRent: number;
  waterBill: number;
  electricBill: number;
  paymentStatus: "unpaid" | "paid" | string;
  lastPaymentDate?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  deposit?: number;
  leaseStatus?: "active" | "expired" | "terminated" | string;
}

const KpiCard = ({ label, value, unit = "฿", color = "text-slate-800", sub }: any) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
    <div className="text-slate-500 font-semibold text-xs mb-1.5 tracking-wide">{label}</div>
    <div className={`text-2xl font-extrabold ${color} tracking-tight`}>
      {value.toLocaleString("th-TH")}
      <span className="text-sm font-semibold text-slate-400 ml-1">{unit}</span>
    </div>
    {sub && <div className="text-[10px] text-slate-400 mt-1 font-medium">{sub}</div>}
  </div>
);

export default function HousePage() {
  const [houses, setHouses] = useState<RentalHouse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<RentalHouse | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  
  // PromptPay QR Trigger
  const [payHouse, setPayHouse] = useState<RentalHouse | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    tenantName: "",
    monthlyRent: 0,
    waterBill: 0,
    electricBill: 0,
    paymentStatus: "unpaid" as RentalHouse["paymentStatus"],
    leaseStartDate: "",
    leaseEndDate: "",
    deposit: 0,
    leaseStatus: "active" as "active" | "expired" | "terminated",
  });

  const loadHouses = async () => {
    try {
      const data = await fetchRentalHouses();
      setHouses(data);
    } catch (err) {
      console.error("Failed to load rental houses:", err);
    }
  };

  const loadPaymentHistory = async (houseId: string) => {
    try {
      const data = await fetchHousePayments(houseId);
      setPayments(data);
    } catch (err) {
      console.error("Failed to load house payments:", err);
    }
  };

  useEffect(() => {
    setTimeout(() => loadHouses(), 0);
  }, []);

  const handleSave = async () => {
    if (editingHouse) {
      try {
        const updated = await updateRentalHouse(editingHouse.id, {
          ...editingHouse,
          ...formData
        });
        setHouses(houses.map(h => h.id === editingHouse.id ? updated : h));
        setIsModalOpen(false);
        setEditingHouse(null);
      } catch (err) {
        console.error("Failed to save rental house:", err);
        alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลบ้านเช่า");
      }
    } else {
      if (!formData.id.trim() || !formData.name.trim()) {
        alert("⚠️ กรุณากรอกรหัสบ้านเช่าและชื่อบ้านเช่าให้ครบถ้วน");
        return;
      }
      try {
        const newHouse = await createRentalHouse(formData);
        setHouses([...houses, newHouse]);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error("Failed to create rental house:", err);
        alert(`❌ ${err.message || "เกิดข้อผิดพลาดในการสร้างบ้านเช่า"}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!editingHouse) return;
    
    const confirmName = prompt(
      `⚠️ คำเตือน: ระบบจะทำการตรวจสอบประวัติการเงินเพื่อความปลอดภัยของระบบบัญชี\nกรุณาพิมพ์ชื่อบ้าน "${editingHouse.name}" เพื่อยืนยันการลบ:`
    );
    
    if (confirmName !== editingHouse.name) {
      alert("❌ ชื่อบ้านไม่ถูกต้อง การลบถูกยกเลิก");
      return;
    }
    
    try {
      await deleteRentalHouse(editingHouse.id);
      setHouses(houses.filter(h => h.id !== editingHouse.id));
      setIsModalOpen(false);
      setEditingHouse(null);
      alert("✅ ลบข้อมูลบ้านเช่าและหน่วยธุรกิจที่เกี่ยวข้องสำเร็จแล้ว");
    } catch (err: any) {
      console.error("Failed to delete rental house:", err);
      alert(`❌ ${err.message || "ไม่สามารถลบบ้านเช่าได้เนื่องจากข้อจำกัด CASCADE ทางบัญชี"}`);
    }
  };

  const openEdit = (house: RentalHouse) => {
    setEditingHouse(house);
    setFormData({
      id: house.id,
      name: house.name,
      tenantName: house.tenantName,
      monthlyRent: house.monthlyRent,
      waterBill: house.waterBill,
      electricBill: house.electricBill,
      paymentStatus: house.paymentStatus,
      leaseStartDate: house.leaseStartDate || "",
      leaseEndDate: house.leaseEndDate || "",
      deposit: house.deposit || 0,
      leaseStatus: (house.leaseStatus || "active") as "active" | "expired" | "terminated",
    });
    setPayments([]);
    setIsModalOpen(true);
    loadPaymentHistory(house.id);
  };

  const openCreate = () => {
    setEditingHouse(null);
    setFormData({
      id: "",
      name: "",
      tenantName: "",
      monthlyRent: 0,
      waterBill: 0,
      electricBill: 0,
      paymentStatus: "unpaid",
      leaseStartDate: "",
      leaseEndDate: "",
      deposit: 0,
      leaseStatus: "active",
    });
    setPayments([]);
    setIsModalOpen(true);
  };

  const togglePayment = async (id: string) => {
    const house = houses.find(h => h.id === id);
    if (!house) return;

    const nextStatus = (house.paymentStatus === "paid" ? "unpaid" : "paid") as "paid" | "unpaid";
    const lastPaymentDate = nextStatus === "paid" ? new Date().toISOString() : house.lastPaymentDate;

    // Optimistic update
    setHouses(houses.map(h => h.id === id ? { ...h, paymentStatus: nextStatus, lastPaymentDate } : h));

    try {
      await updateRentalHouse(id, {
        ...house,
        paymentStatus: nextStatus,
        lastPaymentDate
      });
    } catch (err) {
      console.error("Failed to toggle payment status:", err);
      // Revert on error
      setHouses(houses.map(h => h.id === id ? house : h));
      alert("❌ เกิดข้อผิดพลาดในการบันทึกสถานะการชำระเงิน");
    }
  };

  // Stats
  const totalExpected = houses.reduce((sum, h) => sum + h.monthlyRent + h.waterBill + h.electricBill, 0);
  const totalPaid = houses.reduce((sum, h) => sum + (h.paymentStatus === "paid" ? (h.monthlyRent + h.waterBill + h.electricBill) : 0), 0);
  const occupiedCount = houses.filter(h => h.tenantName && h.tenantName.trim() !== "").length;

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-md mb-2 inline-block">
            Property Module
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">ระบบบ้านเช่า (Rental House)</h1>
          <p className="text-slate-500 text-xs mt-0.5">จัดการบ้านเช่า, ติดตามสัญญา และการชำระเงินรายเดือน</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 hover:scale-[1.02]"
        >
          ➕ เพิ่มบ้านเช่าใหม่
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="บ้านที่มีผู้เช่า" value={occupiedCount} unit="หลัง" color="text-amber-600" sub={`จากทั้งหมด ${houses.length} หลัง`} />
        <KpiCard label="ยอดเรียกเก็บรวม" value={totalExpected} color="text-blue-600" />
        <KpiCard label="ชำระแล้ว" value={totalPaid} color="text-emerald-600" />
        <KpiCard label="ยอดค้างชำระ" value={totalExpected - totalPaid} color="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {houses.map((house) => (
          <div key={house.id} className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold">
                  🏠
                </div>
                <button
                  onClick={() => openEdit(house)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              </div>
              <h3 className="text-lg font-black text-slate-800">{house.name}</h3>
              
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${house.tenantName ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {house.tenantName ? "มีผู้เช่า" : "ว่าง"}
                  </span>
                </div>
                
                {house.tenantName && house.leaseEndDate && (
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                    (() => {
                      const daysLeft = Math.ceil((new Date(house.leaseEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (daysLeft < 0 || house.leaseStatus === "expired") return "bg-rose-50 text-rose-600 border border-rose-100";
                      if (daysLeft <= 30) return "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse";
                      return "bg-sky-50 text-sky-600 border border-sky-100";
                    })()
                  }`}>
                    {(() => {
                      const daysLeft = Math.ceil((new Date(house.leaseEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (daysLeft < 0 || house.leaseStatus === "expired") return "หมดสัญญาเช่า 🔴";
                      if (daysLeft <= 30) return `เหลือสัญญา ${daysLeft} วัน ⚠️`;
                      return "สัญญามีผล 🟢";
                    })()}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 flex-1 space-y-4">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ผู้เช่าปัจจุบัน</div>
                <div className="text-sm font-bold text-slate-700">
                  {house.tenantName || "—"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">ค่าเช่า</div>
                  <div className="text-sm font-black text-slate-800">{house.monthlyRent.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">น้ำ/ไฟ</div>
                  <div className="text-sm font-black text-slate-800">{(house.waterBill + house.electricBill).toLocaleString()} ฿</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">สถานะการจ่ายเงิน</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${house.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {house.paymentStatus === "paid" ? "จ่ายแล้ว ✅" : "ค้างชำระ ❌"}
                  </span>
                </div>
                
                {house.paymentStatus !== "paid" && house.tenantName && (
                  <button
                    onClick={() => setPayHouse(house)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5"
                  >
                    💳 จ่ายผ่าน PromptPay QR
                  </button>
                )}
                
                <button
                  onClick={() => togglePayment(house.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-black transition-all ${
                    house.paymentStatus === "paid"
                      ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {house.paymentStatus === "paid" ? "ยกเลิกการจ่าย" : "ทำเครื่องหมายว่าจ่ายแล้ว"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Edit Modal with Two-Column Form and History --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-[scaleUp_0.3s_ease-out]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800">จัดการข้อมูลสัญญาและเงิน: {editingHouse?.name}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
              {/* Left Column: Form Fields */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  ข้อมูลบ้านเช่าและผู้เช่า
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">รหัสบ้านเช่า</label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      disabled={editingHouse !== null}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-sm font-bold ${
                        editingHouse !== null ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                      placeholder="e.g. h4"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ชื่อบ้านเช่า</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-sm font-bold text-slate-700"
                      placeholder="e.g. บ้านเช่า หลังที่ 4"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ชื่อผู้เช่า</label>
                  <input
                    type="text"
                    value={formData.tenantName}
                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-sm font-semibold"
                    placeholder="ปล่อยว่างหากไม่มีผู้เช่า"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ค่าเช่ารายเดือน (บาท)</label>
                  <input
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-sm font-black"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ค่าน้ำ (บาท)</label>
                    <input
                      type="number"
                      value={formData.waterBill}
                      onChange={(e) => setFormData({ ...formData, waterBill: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ค่าไฟ (บาท)</label>
                    <input
                      type="number"
                      value={formData.electricBill}
                      onChange={(e) => setFormData({ ...formData, electricBill: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-sm"
                    />
                  </div>
                </div>

                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pt-2 pb-1 border-b border-slate-100">
                  📜 ข้อมูลสัญญาเช่า (Lease Agreement)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">วันเริ่มสัญญา</label>
                    <input
                      type="date"
                      value={formData.leaseStartDate}
                      onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">วันสิ้นสุดสัญญา</label>
                    <input
                      type="date"
                      value={formData.leaseEndDate}
                      onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">เงินมัดจำสัญญา (บาท)</label>
                    <input
                      type="number"
                      value={formData.deposit}
                      onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">สถานะสัญญา</label>
                    <select
                      value={formData.leaseStatus}
                      onChange={(e) => setFormData({ ...formData, leaseStatus: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs font-bold"
                    >
                      <option value="active">ใช้งานปกติ (Active)</option>
                      <option value="expired">หมดอายุสัญญา (Expired)</option>
                      <option value="terminated">ยกเลิกสัญญาแล้ว (Terminated)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment History Log */}
              <div className="space-y-4 flex flex-col border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 h-full">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  📜 ประวัติการจ่ายเงินย้อนหลัง (Payment History)
                </h3>
                
                <div className="flex-1 overflow-y-auto max-h-[40vh] md:max-h-none space-y-3 pr-1">
                  {payments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100/60 my-auto">
                      <div className="text-2xl mb-1.5">💸</div>
                      <div className="text-xs font-bold text-slate-400">ยังไม่มีประวัติการชำระเงิน</div>
                      <div className="text-[10px] text-slate-400/80 mt-0.5">ระบบจะบันทึกประวัติหลังบิลถูกชำระเรียบร้อย</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {payments.map((p: Record<string, any>) => (
                        <div key={p.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center">
                          <div>
                            <div className="text-xs font-black text-slate-700">รอบเดือน {p.month}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              ชำระเงินเมื่อ: {p.paid_at ? new Date(p.paid_at).toLocaleDateString("th-TH") : "—"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-emerald-600">
                              +{(p.amount + p.water_bill + p.electric_bill).toLocaleString()} ฿
                            </div>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/50 mt-0.5">
                              จ่ายแล้ว ✅
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
              {editingHouse && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-3 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  🗑️ ลบบ้านเช่านี้
                </button>
              )}
              <div className="flex gap-3 flex-1 justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition shadow-lg shadow-amber-600/20"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PromptPay QR Modal --- */}
      {payHouse && (
        <PromptPayQRCard
          amount={payHouse.monthlyRent + payHouse.waterBill + payHouse.electricBill}
          title={`ค่าเช่าบ้าน ${payHouse.name} รอบเดือนปัจจุบัน`}
          type="house"
          targetId={payHouse.id}
          onSuccess={() => {
            setTimeout(() => loadHouses(), 0);
            setPayHouse(null);
          }}
          onClose={() => setPayHouse(null)}
        />
      )}
    </div>
  );
}
