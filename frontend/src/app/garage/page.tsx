"use client";

import { useState, useEffect } from "react";
import { fetchGarageJobs, createGarageJob, updateGarageJob, deleteGarageJob } from "@/lib/api";
import ReceiptModal from "./ReceiptModal";

interface GarageJob {
  id: string;
  customerName: string;
  licensePlate: string;
  carModel: string;
  description: string;
  status: "pending" | "in_progress" | "finished" | "picked_up" | string;
  totalCost: number;
  paymentStatus: "unpaid" | "paid" | string;
  createdAt: string;
  finishedAt?: string;
}

const STATUS_LABELS = {
  pending: { label: "รอดำเนินการ", color: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress: { label: "กำลังซ่อม", color: "bg-blue-50 text-blue-600 border-blue-200" },
  finished: { label: "ซ่อมเสร็จแล้ว", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  picked_up: { label: "รับรถแล้ว", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
};

interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
  sub?: string;
}

const KpiCard = ({ label, value, unit = "฿", color = "text-slate-800", sub }: KpiCardProps) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
    <div className="text-slate-500 font-semibold text-xs mb-1.5 tracking-wide">{label}</div>
    <div className={`text-2xl font-extrabold ${color} tracking-tight`}>
      {typeof value === "number" ? value.toLocaleString("th-TH") : value}
      <span className="text-sm font-semibold text-slate-400 ml-1">{unit}</span>
    </div>
    {sub && <div className="text-[10px] text-slate-400 mt-1 font-medium">{sub}</div>}
  </div>
);

export default function GaragePage() {
  const [jobs, setJobs] = useState<GarageJob[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<GarageJob | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    licensePlate: "",
    carModel: "",
    description: "",
    status: "pending" as GarageJob["status"],
    totalCost: 0,
    paymentStatus: "unpaid" as GarageJob["paymentStatus"],
  });

  const loadJobs = async () => {
    try {
      const data = await fetchGarageJobs();
      setJobs(data);
    } catch (err) {
      console.error("Failed to load garage jobs:", err);
    }
  };

  useEffect(() => {
    setTimeout(() => loadJobs(), 0);
  }, []);

  const handleSave = async () => {
    try {
      if (editingJob) {
        const updated = await updateGarageJob(Number(editingJob.id), {
          ...editingJob,
          ...formData
        });
        setJobs(jobs.map(j => j.id === editingJob.id ? updated : j));
      } else {
        const created = await createGarageJob({
          ...formData,
          createdAt: new Date().toISOString()
        });
        setJobs([created, ...jobs]);
      }
      setIsModalOpen(false);
      setEditingJob(null);
      setFormData({
        customerName: "",
        licensePlate: "",
        carModel: "",
        description: "",
        status: "pending",
        totalCost: 0,
        paymentStatus: "unpaid",
      });
    } catch (err) {
      console.error("Failed to save garage job:", err);
      alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลงานซ่อม");
    }
  };

  const openEdit = (job: GarageJob) => {
    setEditingJob(job);
    setFormData({
      customerName: job.customerName,
      licensePlate: job.licensePlate,
      carModel: job.carModel,
      description: job.description,
      status: job.status,
      totalCost: job.totalCost,
      paymentStatus: job.paymentStatus,
    });
    setIsModalOpen(true);
  };

  const deleteJob = async (id: string) => {
    if (confirm("ยืนยันการลบรายการนี้?")) {
      try {
        await deleteGarageJob(Number(id));
        setJobs(jobs.filter(j => j.id !== id));
      } catch (err) {
        console.error("Failed to delete garage job:", err);
        alert("❌ เกิดข้อผิดพลาดในการลบงานซ่อม");
      }
    }
  };

  // Receipt state
  const [receiptJob, setReceiptJob] = useState<GarageJob | null>(null);

  // Stats
  const activeJobs = jobs.filter(j => j.status !== "picked_up").length;
  const totalRevenue = jobs.reduce((sum, j) => sum + (j.paymentStatus === "paid" ? j.totalCost : 0), 0);
  const pendingRevenue = jobs.reduce((sum, j) => sum + (j.paymentStatus === "unpaid" ? j.totalCost : 0), 0);
  const finishedJobs = jobs.filter(j => j.status === "finished").length;

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-md mb-2 inline-block">
            Management Module
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">ระบบอู่ซ่อมรถ (Garage)</h1>
          <p className="text-slate-500 text-xs mt-0.5">จัดการงานซ่อม, ตรวจสอบสถานะ และคุมยอดค่าใช้จ่าย</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-orange-600/20"
        >
          <span>➕</span>
          <span>เพิ่มงานซ่อมใหม่</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="งานที่กำลังดำเนินการ" value={activeJobs} unit="คัน" color="text-orange-600" />
        <KpiCard label="ซ่อมเสร็จ (รอรับรถ)" value={finishedJobs} unit="คัน" color="text-emerald-600" />
        <KpiCard label="รายรับทั้งหมด" value={totalRevenue} color="text-blue-600" />
        <KpiCard label="ยอดค้างชำระ" value={pendingRevenue} color="text-rose-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ข้อมูลรถ & ลูกค้า</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">รายละเอียดการซ่อม</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">สถานะ</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">ค่าบริการ</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    ไม่มีข้อมูลงานซ่อมในขณะนี้
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                          {job.licensePlate.slice(-2)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{job.licensePlate}</div>
                          <div className="text-[11px] text-slate-500 font-medium">{job.carModel} — {job.customerName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600 line-clamp-2 max-w-xs">{job.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{new Date(job.createdAt).toLocaleDateString("th-TH")}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${(STATUS_LABELS[job.status as keyof typeof STATUS_LABELS] || STATUS_LABELS.pending).color}`}>
                          {(STATUS_LABELS[job.status as keyof typeof STATUS_LABELS] || STATUS_LABELS.pending).label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${job.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {job.paymentStatus === "paid" ? "จ่ายแล้ว ✅" : "ค้างชำระ ❌"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-slate-800">{job.totalCost.toLocaleString()} ฿</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(job)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {(job.status === "finished" || job.status === "picked_up") && (
                          <button onClick={() => setReceiptJob(job)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="ใบเสร็จ">
                            🧾
                          </button>
                        )}
                        <button onClick={() => deleteJob(job.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-[scaleUp_0.3s_ease-out]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800">{editingJob ? "แก้ไขข้อมูลงานซ่อม" : "เพิ่มงานซ่อมใหม่"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ชื่อลูกค้า</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none text-sm"
                    placeholder="ระบุชื่อลูกค้า"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">เลขทะเบียนรถ</label>
                  <input
                    type="text"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none text-sm"
                    placeholder="กข 1234 กทม"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ยี่ห้อ/รุ่นรถ</label>
                <input
                  type="text"
                  value={formData.carModel}
                  onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none text-sm"
                  placeholder="เช่น Toyota Camry"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">รายละเอียดการซ่อม</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none text-sm min-h-[100px]"
                  placeholder="เช่น เปลี่ยนถ่ายน้ำมันเครื่อง, เช็คระยะ..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">สถานะงาน</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none text-sm"
                  >
                    <option value="pending">รอดำเนินการ</option>
                    <option value="in_progress">กำลังซ่อม</option>
                    <option value="finished">ซ่อมเสร็จแล้ว</option>
                    <option value="picked_up">รับรถแล้ว</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">สถานะการจ่ายเงิน</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none text-sm"
                  >
                    <option value="unpaid">ค้างชำระ</option>
                    <option value="paid">จ่ายแล้ว</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ค่าบริการรวม (บาท)</label>
                <input
                  type="number"
                  value={formData.totalCost}
                  onChange={(e) => setFormData({ ...formData, totalCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none text-sm font-black text-orange-600"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition shadow-lg shadow-orange-600/20"
              >
                {editingJob ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptJob && (
        <ReceiptModal
          job={{
            id: Number(receiptJob.id),
            customer_name: receiptJob.customerName,
            license_plate: receiptJob.licensePlate,
            car_model: receiptJob.carModel,
            description: receiptJob.description,
            status: receiptJob.status,
            total_cost: receiptJob.totalCost,
            payment_status: receiptJob.paymentStatus,
            created_at: receiptJob.createdAt,
            finished_at: receiptJob.finishedAt || null,
          }}
          onClose={() => setReceiptJob(null)}
        />
      )}
    </div>
  );
}
