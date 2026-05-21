"use client";

import { useEffect, useState } from "react";
import { fetchMaintenanceTickets, updateMaintenanceTicketStatus } from "@/lib/api";

interface MaintenanceTicket {
  id: number;
  room_number: string;
  description: string;
  status: "pending" | "in_progress" | "resolved" | string;
  line_user_id?: string;
  created_at: string;
  resolved_at?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: "รอดำเนินการ (Pending)",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "🔴",
    accent: "border-l-amber-500"
  },
  in_progress: {
    label: "กำลังซ่อม (In Progress)",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "🔧",
    accent: "border-l-blue-500"
  },
  resolved: {
    label: "ซ่อมเสร็จสิ้น (Resolved)",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "✅",
    accent: "border-l-emerald-500"
  }
};

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "in_progress" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMaintenanceTickets();
      if (Array.isArray(data)) {
        setTickets(data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Error loading maintenance tickets:", err);
      setError("ไม่สามารถโหลดข้อมูลแจ้งซ่อมได้ โปรดเชื่อมต่อกับ Backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      const updated = await updateMaintenanceTicketStatus(id, newStatus);
      if (updated && updated.id) {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, resolved_at: updated.resolved_at } : t));
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } finally {
      setUpdatingId(null);
    }
  };

  // KPIs
  const totalCount = tickets.length;
  const pendingCount = tickets.filter(t => t.status === "pending").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;

  // Filtering & Search
  const filteredTickets = tickets
    .filter(t => {
      if (filterTab === "all") return true;
      return t.status === filterTab;
    })
    .filter(t => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        t.room_number.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    });

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
        <div className="space-y-2 z-10">
          <span className="text-[10px] font-black tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full uppercase">
            Service & Ticket Module
          </span>
          <h1 className="text-3xl font-black tracking-tight mt-1">ระบบใบแจ้งซ่อมผ่าน LINE OA</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            ลูกหอสามารถพิมพ์ <code className="text-blue-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">แจ้งซ่อม [เลขห้อง] [ปัญหา]</code> เข้ามาทางไลน์ของหอพัก ระบบจะสร้างใบงานที่นี่อัตโนมัติ และจะแจ้งเตือนเมื่อคุณปรับสถานะ!
          </p>
        </div>
        <button
          onClick={loadTickets}
          className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-600/30 active:scale-95 group z-10"
        >
          <svg
            className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12" />
          </svg>
          <span>โหลดข้อมูลใหม่ (Refresh)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ใบงานทั้งหมด</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-extrabold text-slate-800">{totalCount}</span>
            <span className="text-xs font-bold text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] border-l-4 border-l-amber-500 flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">รอดำเนินการ</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-extrabold text-slate-800">{pendingCount}</span>
            <span className="text-xs font-bold text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] border-l-4 border-l-blue-500 flex flex-col justify-between">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">กำลังซ่อมแซม</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-extrabold text-slate-800">{inProgressCount}</span>
            <span className="text-xs font-bold text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">เสร็จสิ้นแล้ว</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-extrabold text-slate-800">{resolvedCount}</span>
            <span className="text-xs font-bold text-slate-400">รายการ</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${filterTab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            ทั้งหมด ({totalCount})
          </button>
          <button
            onClick={() => setFilterTab("pending")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${filterTab === "pending" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            รอดำเนินการ ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab("in_progress")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${filterTab === "in_progress" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            กำลังซ่อม ({inProgressCount})
          </button>
          <button
            onClick={() => setFilterTab("resolved")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${filterTab === "resolved" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            เสร็จสิ้น ({resolvedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="ค้นหาเลขห้อง หรือปัญหาชำรุด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs transition"
          />
        </div>
      </div>

      {/* Main Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-semibold">กำลังโหลดข้อมูลใบแจ้งซ่อม...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-rose-50 border border-rose-100 rounded-3xl p-6">
          <div className="text-3xl mb-3">⚠️</div>
          <h3 className="text-rose-900 font-extrabold text-lg mb-1">เกิดข้อผิดพลาด</h3>
          <p className="text-rose-600 text-xs max-w-md mx-auto mb-6">{error}</p>
          <button
            onClick={loadTickets}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-slate-800 font-black text-lg mb-1">ไม่พบรายการใบแจ้งซ่อม</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            ไม่มีคำแจ้งซ่อมบำรุงที่ตรงกับตัวกรองหรือคำค้นหานี้ในขณะนี้ ลูกบ้านสามารถแจ้งซ่อมผ่าน LINE Webhook ของหอพักได้ทันที!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map(ticket => {
            const config = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || {
              label: ticket.status,
              color: "bg-slate-50 text-slate-700 border-slate-200",
              badge: "📝",
              accent: "border-l-slate-400"
            };

            const createdDate = new Date(ticket.created_at);
            const resolvedDate = ticket.resolved_at ? new Date(ticket.resolved_at) : null;

            return (
              <div
                key={ticket.id}
                className={`bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] border-l-4 ${config.accent} p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:-translate-y-1 duration-300 transition-all`}
              >
                <div>
                  {/* Badge & Ticket ID */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-black text-slate-400 tracking-wider">
                      TICKET #{ticket.id}
                    </span>
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border flex items-center gap-1.5 ${config.color}`}>
                      <span>{config.badge}</span>
                      <span>{config.label}</span>
                    </span>
                  </div>

                  {/* Room Number */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-extrabold text-blue-700 text-sm border border-blue-100 shadow-sm">
                      {ticket.room_number}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base">ห้อง {ticket.room_number}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">แจ้งซ่อมจากห้องพัก</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 mb-5">
                    <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                      {ticket.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Metadata and LINE Binding status */}
                  <div className="border-t border-slate-50 pt-4 flex flex-col gap-2 text-[10px] text-slate-400 font-semibold">
                    <div className="flex justify-between items-center">
                      <span>📅 วันที่รับเรื่อง:</span>
                      <span className="text-slate-600">
                        {createdDate.toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>

                    {resolvedDate && (
                      <div className="flex justify-between items-center">
                        <span>✅ วันที่แก้ไขเสร็จสิ้น:</span>
                        <span className="text-emerald-600 font-bold">
                          {resolvedDate.toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span>💬 การผูกไลน์ (LINE OA):</span>
                      {ticket.line_user_id ? (
                        <span className="text-emerald-500 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          เชื่อมต่อแล้ว (พร้อมรับ Push)
                        </span>
                      ) : (
                        <span className="text-amber-500 font-black">ไม่ได้เชื่อมต่อ</span>
                      )}
                    </div>
                  </div>

                  {/* Control Actions */}
                  {ticket.status !== "resolved" && (
                    <div className="flex gap-2.5 pt-1">
                      {ticket.status === "pending" && (
                        <button
                          disabled={updatingId === ticket.id}
                          onClick={() => handleStatusChange(ticket.id, "in_progress")}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black rounded-xl text-[11px] tracking-wide transition-all shadow-md shadow-blue-600/10 active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          {updatingId === ticket.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>🔧</span>
                              <span>เริ่มดำเนินการ</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        disabled={updatingId === ticket.id}
                        onClick={() => handleStatusChange(ticket.id, "resolved")}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black rounded-xl text-[11px] tracking-wide transition-all shadow-md shadow-emerald-600/10 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        {updatingId === ticket.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>✅</span>
                            <span>แก้ไขเสร็จสิ้น</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {ticket.status === "resolved" && (
                    <div className="py-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        🎉 ดำเนินการซ่อมบำรุงเรียบร้อยแล้ว
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
