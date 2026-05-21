"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  fetchCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer, 
  fetchUnits 
} from "@/lib/api";

interface BusinessUnit {
  id: number;
  name: string;
  type: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  line_user_id?: string;
  unit_id: number;
  unit?: BusinessUnit;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState("");

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    line_user_id: "",
    unit_id: ""
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [custList, unitList] = await Promise.all([
        fetchCustomers(),
        fetchUnits()
      ]);
      setCustomers(custList || []);
      setUnits(unitList || []);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const openModal = (customer: Customer | null = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || "",
        line_user_id: customer.line_user_id || "",
        unit_id: String(customer.unit_id)
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        phone: "",
        line_user_id: "",
        unit_id: units.length > 0 ? String(units[0].id) : ""
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unit_id) {
      alert("กรุณากรอกชื่อและเลือกหน่วยธุรกิจ");
      return;
    }

    const payload = {
      ...formData,
      unit_id: parseInt(formData.unit_id)
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        triggerToast("✅ อัปเดตข้อมูลลูกค้าเรียบร้อย!");
      } else {
        await createCustomer(payload);
        triggerToast("✨ เพิ่มลูกค้าใหม่เรียบร้อย!");
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้ารายนี้?")) return;
    try {
      await deleteCustomer(id);
      triggerToast("🗑️ ลบข้อมูลลูกค้าเรียบร้อย");
      loadData();
    } catch (err) {
      alert("ไม่สามารถลบข้อมูลลูกค้าได้");
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (c.phone || "").includes(searchTerm);
      const matchesUnit = filterUnit === "all" || String(c.unit_id) === filterUnit;
      return matchesSearch && matchesUnit;
    });
  }, [customers, searchTerm, filterUnit]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 z-50 flex items-center gap-2 text-xs font-bold animate-[slideUp_0.3s_ease-out]">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-2 inline-block">
            Tenant & Customer Registry
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">จัดการรายชื่อผู้เช่าและลูกค้า</h1>
          <p className="text-slate-400 text-xs mt-0.5">บันทึกข้อมูลพื้นฐานและผูกบัญชี LINE เพื่อใช้ระบบแจ้งเตือนอัตโนมัติ</p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition-all"
        >
          <span>➕</span>
          <span>เพิ่มลูกค้าใหม่</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
          value={filterUnit}
          onChange={(e) => setFilterUnit(e.target.value)}
        >
          <option value="all">ทุกหน่วยธุรกิจ</option>
          {units.map(u => (
            <option key={u.id} value={String(u.id)}>{u.name}</option>
          ))}
        </select>
        <div className="flex items-center justify-end text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
          พบทั้งหมด {filteredCustomers.length} รายชื่อ
        </div>
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-2xl border border-slate-100" />
          ))
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-sm font-bold text-slate-400 text-center">ไม่พบข้อมูลลูกค้าที่ค้นหา</div>
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:scale-110 transition-transform ${c.line_user_id ? 'bg-green-500' : 'bg-slate-500'}`} />
              
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl">
                  {c.unit?.type === 'dormitory' ? '🏢' : c.unit?.type === 'garage' ? '🔧' : '🏠'}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openModal(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-black text-slate-800 tracking-tight">{c.name}</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{c.phone || "ไม่มีเบอร์โทรศัพท์"}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  {c.unit?.name || "ไม่ระบุหน่วยงาน"}
                </div>
                {c.line_user_id ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    LINE LINKED
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-slate-300">
                    NO LINE LINK
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800">{editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">LINE User ID</label>
                <input
                  type="text"
                  placeholder="Uxxxxxxx..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-mono"
                  value={formData.line_user_id}
                  onChange={e => setFormData({...formData, line_user_id: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">หน่วยธุรกิจ</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={formData.unit_id}
                  onChange={e => setFormData({...formData, unit_id: e.target.value})}
                >
                  <option value="" disabled>เลือกหน่วยธุรกิจ</option>
                  {units.map(u => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-sm font-black text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
