"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDormitoryData } from "@/lib/useDormitoryData";
import { useGarageData } from "@/lib/useGarageData";
import { useHouseData } from "@/lib/useHouseData";
import { authFetch, fetchExpiringLeases } from "@/lib/api";

// --- Donut Chart ---
const DonutChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((acc, item) => acc + item.value, 0) || 1;

  // Premium glow gradients
  const gradients = [
    { start: "#60A5FA", end: "#2563EB", glow: "rgba(37,99,235,0.2)" }, // Premium Royal Blue
    { start: "#34D399", end: "#059669", glow: "rgba(5,150,105,0.2)" }, // Emerald Green
    { start: "#FBBF24", end: "#D97706", glow: "rgba(217,119,6,0.2)" }, // Amber Gold
  ];

  return (
    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
      <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
        <defs>
          {gradients.map((grad, idx) => (
            <linearGradient id={`donutGrad-${idx}`} key={idx} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={grad.start} />
              <stop offset="100%" stopColor={grad.end} />
            </linearGradient>
          ))}
          <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.08" />
          </filter>
        </defs>
        
        {data.map((item, idx) => {
          if (item.value === 0) return null;
          const percentage = item.value / total;
          
          if (percentage >= 0.999) {
            return (
              <circle
                key={idx}
                cx="60" cy="60" r="42"
                fill="none"
                stroke={`url(#donutGrad-${idx % gradients.length})`}
                strokeWidth="14"
                filter="url(#shadowFilter)"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          }

          const sliceAngle = percentage * 360;
          const prevSum = data.slice(0, idx).reduce((s, d) => s + d.value, 0);
          const startAngle = -90 + ((prevSum / total) * 360);
          const endAngle = startAngle + sliceAngle;

          const toRad = (deg: number) => (Math.PI * deg) / 180;
          const rInner = 30;
          const rOuter = 44;

          const x1o = 60 + rOuter * Math.cos(toRad(startAngle));
          const y1o = 60 + rOuter * Math.sin(toRad(startAngle));
          const x2o = 60 + rOuter * Math.cos(toRad(endAngle));
          const y2o = 60 + rOuter * Math.sin(toRad(endAngle));

          const x1i = 60 + rInner * Math.cos(toRad(endAngle));
          const y1i = 60 + rInner * Math.sin(toRad(endAngle));
          const x2i = 60 + rInner * Math.cos(toRad(startAngle));
          const y2i = 60 + rInner * Math.sin(toRad(startAngle));

          const largeArc = percentage > 0.5 ? 1 : 0;
          
          const isHovered = hoveredIndex === idx;
          const angleOffset = isHovered ? 3.5 : 0;
          const midAngle = startAngle + sliceAngle / 2;
          const tx = angleOffset * Math.cos(toRad(midAngle));
          const ty = angleOffset * Math.sin(toRad(midAngle));

          return (
            <path
              key={idx}
              d={`M ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2i} ${y2i} Z`}
              fill={`url(#donutGrad-${idx % gradients.length})`}
              className="transition-all duration-300 cursor-pointer stroke-white stroke-[2px]"
              style={{
                transform: `translate(${tx}px, ${ty}px)`,
                filter: isHovered 
                  ? `drop-shadow(0 4px 10px ${gradients[idx % gradients.length].glow})` 
                  : 'none',
                transformOrigin: '60px 60px'
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>
      
      {/* Center Details Display */}
      <div className="absolute w-[56%] h-[56%] bg-white rounded-full shadow-[inset_0_2px_6px_rgba(0,0,0,0.05),0_8px_16px_rgba(0,0,0,0.02)] backdrop-blur-md flex flex-col items-center justify-center p-2 text-center border border-slate-50/50">
        {hoveredIndex !== null ? (
          <div className="animate-[fadeIn_0.2s_ease-out]">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block truncate max-w-[70px]">{data[hoveredIndex].label}</span>
            <span className="text-sm font-black text-slate-800 block mt-0.5 leading-none">
              {Math.round((data[hoveredIndex].value / total) * 100)}%
            </span>
            <span className="text-[9px] font-extrabold text-slate-500 mt-1 block">
              {data[hoveredIndex].value.toLocaleString()} ฿
            </span>
          </div>
        ) : (
          <div className="animate-[fadeIn_0.2s_ease-out]">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">รายรับรวม</span>
            <span className="text-xs font-black text-blue-600 block mt-0.5 leading-none">
              {total.toLocaleString()} ฿
            </span>
            <span className="text-[7px] font-black text-emerald-500 block mt-1 bg-emerald-50 px-1 py-0.5 rounded-full border border-emerald-100/30">
              REAL-TIME
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Occupancy Ring ---
const OccupancyRing = ({ rate }: { rate: number }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;
  return (
    <div className="relative w-30 h-30 mx-auto flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 overflow-visible">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="ringGradWarning" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="ringGradDanger" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F5F9" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={`url(${rate >= 80 ? "#ringGrad" : rate >= 50 ? "#ringGradWarning" : "#ringGradDanger"})`}
          strokeWidth="8.5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: rate >= 80 ? "drop-shadow(0 2px 4px rgba(16,185,129,0.3))" : 
                    rate >= 50 ? "drop-shadow(0 2px 4px rgba(217,119,6,0.3))" : 
                                 "drop-shadow(0 2px 4px rgba(239,68,68,0.3))"
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center w-[72%] h-[72%] bg-white rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.03)] border border-slate-50">
        <span className="text-xl font-black bg-gradient-to-br from-slate-800 to-slate-900 bg-clip-text text-transparent">{rate}%</span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">อัตราเช่า</span>
      </div>
    </div>
  );
};

// --- KPI Stat Card ---
const KpiCard = ({
  label, value, unit = "฿", color = "text-slate-800", bg = "bg-white", sub
}: {
  label: string; value: string | number; unit?: string;
  color?: string; bg?: string; sub?: string;
}) => (
  <div className={`${bg} rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center`}>
    <div className="text-slate-500 font-semibold text-xs mb-1.5 tracking-wide text-center">{label}</div>
    <div className={`text-2xl font-extrabold ${color} tracking-tight`}>
      {typeof value === "number" ? value.toLocaleString("th-TH") : value}
      <span className="text-sm font-semibold text-slate-400 ml-1">{unit}</span>
    </div>
    {sub && <div className="text-[10px] text-slate-400 mt-1 font-medium">{sub}</div>}
  </div>
);

const DORM_COLORS = ["#2563EB", "#10B981", "#F59E0B"];

export default function Dashboard() {
  const dorm = useDormitoryData();
  const garage = useGarageData();
  const house = useHouseData();
  const [isClient, setIsClient] = useState(false);
  const [expiringLeases, setExpiringLeases] = useState<Record<string, any>[]>([]);

  const [billingResult, setBillingResult] = useState<Record<string, any> | null>(null);
  const [showBilling, setShowBilling] = useState(false);
  const [sendingLine, setSendingLine] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    setTimeout(() => setIsClient(true), 0);
    fetchExpiringLeases()
      .then(setExpiringLeases)
      .catch(err => console.error("Error fetching expiring leases on Dashboard:", err));
  }, []);

  const checkBilling = async () => {
    try {
      const res = await authFetch(`${API_BASE}/notify/billing-reminder`, { method: "POST" });
      const result = await res.json();
      setBillingResult(result);
      setShowBilling(true);
    } catch { alert("ไม่สามารถเช็คบิลได้"); }
  };

  const sendLineReminders = async () => {
    if (!billingResult || billingResult.unpaid_rooms === 0) return;
    if (!confirm(`ต้องการส่งใบแจ้งยอดค่าเช่าหอพักจำนวน ${billingResult.unpaid_rooms} ห้อง ไปยัง LINE OA ของลูกหอแต่ละรายใช่หรือไม่?\n\n*ระบบจะจัดส่งเฉพาะห้องที่เชื่อมต่อไลน์สำเร็จเท่านั้น`)) {
      return;
    }
    setSendingLine(true);
    try {
      const res = await authFetch(`${API_BASE}/notify/billing-reminder?send_line=true`, { method: "POST" });
      const result = await res.json();
      setBillingResult(result);
      alert(`🎉 ดำเนินการส่งแจ้งบิลเข้า LINE OA สำเร็จ!\n\n• ส่งสำเร็จ: ${result.line_push_success} ห้อง\n• ส่งล้มเหลว/ไม่มี LINE ID: ${result.line_push_failed} ห้อง`);
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาดในการส่ง LINE แจ้งบิล");
    } finally {
      setSendingLine(false);
    }
  };

  // Donut data from real dorm stats
  const donutData = dorm.dorms
    .filter(d => d.expectedRevenue > 0)
    .map((d, i) => ({ label: d.label, value: d.expectedRevenue, color: DORM_COLORS[i] }));

  // If no data yet, show proportional default
  const chartData = donutData.length > 0 ? donutData : [
    { label: "หอ 26/20", value: 40, color: DORM_COLORS[0] },
    { label: "หอ 26/577", value: 35, color: DORM_COLORS[1] },
    { label: "หอ 73/17", value: 25, color: DORM_COLORS[2] },
  ];
  const chartTotal = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      
      {/* --- Header --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md mb-2 inline-block">
            ภาพรวมระบบ
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-xs mt-0.5">ข้อมูลแบบ Realtime จากระบบทั้งหมด</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={checkBilling}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 via-rose-600 to-red-700 hover:from-red-600 hover:via-rose-700 hover:to-red-800 text-white rounded-xl text-xs font-black transition-all shadow-[0_0_12px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-500/30 cursor-pointer relative overflow-hidden group active:scale-95 duration-200 animate-pulse hover:animate-none"
            title="ระวัง! การกดปุ่มนี้จะเป็นการตรวจสอบรายการค้างชำระทั้งหมดและสามารถส่งบิลแจ้งหนี้ไปยัง LINE OA ของทุกคนพร้อมกันได้"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-200"></span>
            </span>
            <span>🚨 ยิงบิลแจ้งยอดทั้งหมด (ส่ง LINE ทุกคน)</span>
          </button>
          
          <Link
            href="/dormitory"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-600/20"
          >
            <span>🏢</span>
            <span>หอพัก</span>
          </Link>
          <Link
            href="/garage"
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-orange-600/20"
          >
            <span>🔧</span>
            <span>อู่ซ่อมรถ</span>
          </Link>
          <Link
            href="/house"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20"
          >
            <span>🏠</span>
            <span>บ้านเช่า</span>
          </Link>
        </div>
      </div>

      {/* --- Top KPI Row --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="ยอดเรียกเก็บรวม (3 หอ)"
          value={dorm.grandExpectedRevenue}
          color="text-blue-600"
          sub={isClient ? `${dorm.totalOccupied} ห้องที่มีผู้เช่า` : ""}
        />
        <KpiCard
          label="ชำระเงินแล้ว"
          value={dorm.grandPaidRevenue}
          color="text-emerald-600"
          sub={`${dorm.grandExpectedRevenue > 0 ? Math.round((dorm.grandPaidRevenue / dorm.grandExpectedRevenue) * 100) : 0}% ของยอดเรียกเก็บ`}
        />
        <KpiCard
          label="ยอดค้างชำระ"
          value={dorm.grandPendingRevenue}
          color={dorm.grandPendingRevenue > 0 ? "text-rose-600" : "text-slate-400"}
          sub={dorm.recentPendingRooms.length > 0 ? `${dorm.recentPendingRooms.length}+ ห้องยังไม่จ่าย` : "ชำระครบแล้ว ✅"}
        />
        <KpiCard
          label="ห้องว่างทั้งหมด"
          value={dorm.totalVacant}
          unit="ห้อง"
          color={dorm.totalVacant > 5 ? "text-amber-600" : "text-slate-700"}
          sub={`จาก ${dorm.totalRooms} ห้องทั้งหมด`}
        />
      </div>

      {/* --- Widget แจ้งเตือนสัญญาเช่าหมดอายุ --- */}
      {isClient && expiringLeases.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] space-y-4 animate-[fadeIn_0.4s_ease-out]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">สัญญาเช่าสิ้นสุด / กำลังจะหมดอายุ (ภายใน 30 วัน)</h3>
                <p className="text-slate-400 text-[10px] font-medium">กรุณาติดต่อผู้เช่าเพื่อทำสัญญาใหม่หรือเตรียมการย้ายออก</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md">
              {expiringLeases.length} รายการ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[220px] overflow-y-auto pr-1">
            {expiringLeases.map((lease) => {
              const isOverdue = lease.days_left < 0;
              return (
                <div
                  key={lease.id}
                  className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 ${
                    isOverdue
                      ? "bg-rose-50/40 border-rose-100 hover:border-rose-300"
                      : "bg-amber-50/30 border-amber-100 hover:border-amber-300"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        lease.type === "dormitory" 
                          ? "bg-blue-50 text-blue-600 border border-blue-100" 
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {lease.type === "dormitory" ? "หอพัก" : "บ้านเช่า"}
                      </span>
                      <h4 className="font-black text-xs text-slate-800 mt-2">{lease.target_name}</h4>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isOverdue 
                        ? "bg-rose-100 text-rose-700 border border-rose-200" 
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}>
                      {isOverdue ? "หมดอายุสัญญา" : `อีก ${lease.days_left} วัน`}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">👤 ผู้เช่า:</span>
                      <span className="text-slate-700 font-bold">{lease.tenant_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">📅 วันสิ้นสุด:</span>
                      <span className="text-slate-700 font-bold font-mono">{lease.end_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">💰 เงินประกัน:</span>
                      <span className="text-slate-700 font-bold">{(lease.deposit || 0).toLocaleString()} ฿</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Dormitory Detail Section --- */}
      <div>
        <h2 className="text-base font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          🏢 <span>สรุปรายหอพัก</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dorm.dorms.map((d, i) => {
            const payRate = d.expectedRevenue > 0
              ? Math.round((d.paidRevenue / d.expectedRevenue) * 100)
              : 0;

            return (
              <div
                key={d.key}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-4"
              >
                {/* Dorm header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DORM_COLORS[i] }}
                    />
                    <span className="font-black text-slate-800 text-sm">{d.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                    {d.totalRooms} ห้อง
                  </span>
                </div>

                {/* Occupancy mini bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                    <span>เช่าแล้ว {d.occupied} / ว่าง {d.vacant}</span>
                    <span style={{ color: DORM_COLORS[i] }}>
                      {d.totalRooms > 0 ? Math.round((d.occupied / d.totalRooms) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${d.totalRooms > 0 ? (d.occupied / d.totalRooms) * 100 : 0}%`,
                        backgroundColor: DORM_COLORS[i],
                      }}
                    />
                  </div>
                </div>

                {/* Revenue row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">เรียกเก็บ</div>
                    <div className="text-sm font-extrabold text-slate-700">
                      {d.expectedRevenue.toLocaleString("th-TH")} ฿
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">จ่ายแล้ว</div>
                    <div className="text-sm font-extrabold text-emerald-700">
                      {d.paidRevenue.toLocaleString("th-TH")} ฿
                    </div>
                  </div>
                </div>

                {/* Payment progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                    <span>สถานะชำระเงิน</span>
                    <span className="text-emerald-600 font-bold">{payRate}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${payRate}%` }}
                    />
                  </div>
                  {d.pendingRevenue > 0 && (
                    <div className="text-[10px] text-rose-500 font-semibold mt-1">
                      ค้างชำระ {d.pendingRevenue.toLocaleString("th-TH")} ฿
                    </div>
                  )}
                </div>

                <Link
                  href="/dormitory"
                  className="text-center text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                >
                  จัดการ {d.label} →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Charts Row --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Donut — Revenue proportion */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">สัดส่วนรายรับตามหอพัก</h3>
          <DonutChart data={chartData} />
          <div className="space-y-2 mt-5">
            {chartData.map((d, i) => {
              const pct = chartTotal > 0 ? Math.round((d.value / chartTotal) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                    {d.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{d.value.toLocaleString("th-TH")} ฿</span>
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: d.color + "20", color: d.color }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Occupancy ring panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-700 self-start">อัตราการเช่า (All Dorms)</h3>
          <OccupancyRing rate={dorm.occupancyRate} />
          <div className="w-full grid grid-cols-3 gap-2 text-center">
            {dorm.dorms.map((d, i) => (
              <div key={d.key} className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 truncate">{d.label}</div>
                <div
                  className="text-sm font-black mt-0.5"
                  style={{ color: DORM_COLORS[i] }}
                >
                  {d.totalRooms > 0 ? Math.round((d.occupied / d.totalRooms) * 100) : 0}%
                </div>
                <div className="text-[9px] text-slate-400">{d.occupied}/{d.totalRooms}</div>
              </div>
            ))}
          </div>
          <div className="w-full grid grid-cols-2 gap-3 text-center text-xs">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wide mb-0.5">ค่าน้ำรวม</div>
              <div className="font-black text-blue-700">{dorm.grandWaterRevenue.toLocaleString("th-TH")} ฿</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mb-0.5">ค่าไฟรวม</div>
              <div className="font-black text-amber-700">{dorm.grandElectricRevenue.toLocaleString("th-TH")} ฿</div>
            </div>
          </div>
        </div>

        {/* Payment status panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h3 className="text-sm font-bold text-slate-700 mb-4">สถานะชำระเงิน</h3>

          {/* Summary bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1.5">
              <span>ชำระแล้ว {dorm.grandExpectedRevenue > 0 ? Math.round((dorm.grandPaidRevenue / dorm.grandExpectedRevenue) * 100) : 0}%</span>
              <span>ค้าง {dorm.grandExpectedRevenue > 0 ? Math.round((dorm.grandPendingRevenue / dorm.grandExpectedRevenue) * 100) : 0}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${dorm.grandExpectedRevenue > 0 ? (dorm.grandPaidRevenue / dorm.grandExpectedRevenue) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-rose-400 transition-all duration-700"
                style={{ width: `${dorm.grandExpectedRevenue > 0 ? (dorm.grandPendingRevenue / dorm.grandExpectedRevenue) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Pending rooms list */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ห้องค้างชำระ</div>
            {dorm.recentPendingRooms.length === 0 ? (
              <div className="text-center py-6 text-emerald-500 font-bold text-sm">
                ✅ ชำระครบทุกห้องแล้ว!
              </div>
            ) : (
              dorm.recentPendingRooms.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl"
                >
                  <div>
                    <span className="text-xs font-black text-rose-700">ห้อง {r.number}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">{r.dormLabel}</span>
                    {r.tenant && <div className="text-[10px] text-slate-500">{r.tenant}</div>}
                  </div>
                  <div className="text-xs font-black text-rose-600">
                    {(r.rate + (r.waterCost || 0) + (r.electricCost || 0) + (r.cleaningFee || 0) + (r.otherFee || 0) + (r.fineCost || 0)).toLocaleString("th-TH")} ฿
                  </div>
                </div>
              ))
            )}
            {dorm.recentPendingRooms.length > 0 && (
              <Link
                href="/dormitory"
                className="block text-center text-[11px] font-bold text-rose-500 hover:text-rose-700 mt-2"
              >
                ดูทั้งหมด →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* --- Recently Paid Rooms --- */}
      {dorm.recentPaidRooms.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">ห้องที่ชำระเงินแล้ว (ล่าสุด)</h3>
            <Link href="/dormitory" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              ไปจัดการหอพัก →
            </Link>
          </div>
          <div className="p-2">
            {dorm.recentPaidRooms.map((r, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition duration-150"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-black">
                    {r.number}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-700">{r.tenant}</div>
                    <div className="text-[10px] font-semibold text-slate-400">{r.dormLabel}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                    จ่ายแล้ว ✅
                  </span>
                  <span className="font-black text-[13px] text-emerald-600">
                    +{(r.rate + (r.waterCost || 0) + (r.electricCost || 0) + (r.cleaningFee || 0) + (r.otherFee || 0) + (r.fineCost || 0)).toLocaleString("th-TH")} ฿
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Garage Section --- */}
      <div className="pt-6 border-t border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            🔧 <span>สรุปงานอู่ซ่อมรถ (Garage)</span>
          </h2>
          <Link href="/garage" className="text-xs font-bold text-orange-600 hover:underline">
            จัดการงานซ่อม →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="งานกำลังซ่อม"
            value={garage.activeJobs}
            unit="คัน"
            color="text-orange-600"
            bg="bg-orange-50/30"
          />
          <KpiCard
            label="รายรับอู่ทั้งหมด"
            value={garage.totalRevenue}
            color="text-blue-600"
          />
          <KpiCard
            label="ชำระเงินแล้ว"
            value={garage.paidRevenue}
            color="text-emerald-600"
            sub={`${garage.totalRevenue > 0 ? Math.round((garage.paidRevenue / garage.totalRevenue) * 100) : 0}% ของยอดรวม`}
          />
          <KpiCard
            label="ยอดค้างชำระ"
            value={garage.pendingRevenue}
            color={garage.pendingRevenue > 0 ? "text-rose-600" : "text-slate-400"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Donut */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">สถานะงานซ่อม</h3>
            <DonutChart data={garage.statusDistribution} />
            <div className="space-y-2 mt-5">
              {garage.statusDistribution.map((d, i) => {
                const pct = garage.totalJobs > 0 ? Math.round((d.value / garage.totalJobs) * 100) : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                      {d.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{d.value} คัน</span>
                      <span
                        className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: d.color + "20", color: d.color }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Jobs List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">รายการงานซ่อมล่าสุด</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">อัปเดตล่าสุด</span>
            </div>
            <div className="divide-y divide-slate-50">
              {garage.recentJobs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs font-medium">ไม่มีรายการงานซ่อมในขณะนี้</div>
              ) : (
                garage.recentJobs.map((job) => (
                  <div key={job.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-xs">
                        {job.licensePlate.slice(-2)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{job.licensePlate}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{job.carModel} — {job.customerName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-800">{job.totalCost.toLocaleString()} ฿</div>
                        <div className={`text-[9px] font-bold ${job.paymentStatus === "paid" ? "text-emerald-500" : "text-rose-500"}`}>
                          {job.paymentStatus === "paid" ? "จ่ายแล้ว ✅" : "ค้างชำระ ❌"}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black border ${
                        job.status === "finished" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                        job.status === "in_progress" ? "bg-blue-50 border-blue-100 text-blue-600" :
                        job.status === "picked_up" ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                        "bg-slate-50 border-slate-100 text-slate-500"
                      }`}>
                        {job.status === "finished" ? "เสร็จแล้ว" : 
                         job.status === "in_progress" ? "กำลังซ่อม" : 
                         job.status === "picked_up" ? "รับรถแล้ว" : "รอซ่อม"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Rental House Section --- */}
      <div className="pt-6 border-t border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            🏠 <span>สรุปบ้านเช่า (Rental House)</span>
          </h2>
          <Link href="/house" className="text-xs font-bold text-amber-600 hover:underline">
            จัดการบ้านเช่า →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="บ้านที่มีผู้เช่า"
            value={house.occupiedHouses}
            unit="หลัง"
            color="text-amber-600"
            bg="bg-amber-50/30"
            sub={`จากทั้งหมด ${house.totalHouses} หลัง`}
          />
          <KpiCard
            label="รายรับบ้านเช่ารวม"
            value={house.totalExpectedRevenue}
            color="text-blue-600"
          />
          <KpiCard
            label="ชำระเงินแล้ว"
            value={house.paidRevenue}
            color="text-emerald-600"
            sub={`${house.totalExpectedRevenue > 0 ? Math.round((house.paidRevenue / house.totalExpectedRevenue) * 100) : 0}% ของยอดรวม`}
          />
          <KpiCard
            label="ยอดค้างชำระ"
            value={house.pendingRevenue}
            color={house.pendingRevenue > 0 ? "text-rose-600" : "text-slate-400"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {house.houses.map((h) => (
            <div key={h.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-sm">🏠</div>
                  <span className="font-bold text-slate-800 text-sm">{h.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${h.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {h.paymentStatus === "paid" ? "จ่ายแล้ว ✅" : "ค้าง ❌"}
                </span>
              </div>
              <div className="flex flex-col gap-1 mb-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ผู้เช่า</div>
                <div className="text-xs font-bold text-slate-700 truncate">{h.tenantName || "— (ว่าง) —"}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">ยอดสุทธิ</span>
                <span className="text-sm font-black text-slate-800">{(h.monthlyRent + h.waterBill + h.electricBill).toLocaleString()} ฿</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state if no data at all */}
      {dorm.totalOccupied === 0 && garage.totalJobs === 0 && house.occupiedHouses === 0 && (
        <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-extrabold text-slate-700 mb-2">ยังไม่มีข้อมูลในระบบ</h3>
          <p className="text-slate-400 text-sm mb-6">เริ่มต้นเพิ่มข้อมูลในระบบหอพัก อู่ซ่อมรถ หรือบ้านเช่า แล้ว Dashboard จะแสดงสถิติแบบ Realtime</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/dormitory"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-blue-600/20"
            >
              <span>🏢</span>
              <span>จัดการหอพัก</span>
            </Link>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-black transition-all"
            >
              <span>📜</span>
              <span>ดูประวัติธุรกรรม</span>
            </Link>
          </div>
        </div>
      )}
      
      {/* ========== Monthly Trend Chart ========== */}
      <MonthlyChart />

      {/* Billing Reminder Modal */}
      {showBilling && billingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={() => setShowBilling(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>🔔</span> สรุปบิลค้างชำระ (Unpaid Bills)
              </h3>
              <button onClick={() => setShowBilling(false)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                ✕
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3.5 bg-blue-50 rounded-2xl border border-blue-100/50">
                <span className="text-sm font-bold text-blue-700">🏢 หอพัก (Rooms)</span>
                <span className="text-lg font-black text-blue-800">{billingResult.unpaid_rooms} ห้อง</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-amber-50 rounded-2xl border border-amber-100/50">
                <span className="text-sm font-bold text-amber-700">🏠 บ้านเช่า (Houses)</span>
                <span className="text-lg font-black text-amber-800">{billingResult.unpaid_houses} หลัง</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-orange-50 rounded-2xl border border-orange-100/50">
                <span className="text-sm font-bold text-orange-700">🔧 อู่ซ่อมรถ (Garage)</span>
                <span className="text-lg font-black text-orange-800">{billingResult.unpaid_jobs} งาน</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-900 rounded-2xl">
                <span className="text-sm font-bold text-slate-300">ยอดค้างชำระทั้งหมด</span>
                <span className="text-xl font-black text-emerald-400">{billingResult.total_unpaid} รายการ</span>
              </div>
            </div>

            {/* LINE OA Dispatch Status / Trigger */}
            {billingResult.send_line_executed ? (
              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">📊 สรุปผลการส่งผ่าน LINE OA</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-emerald-500">ส่งสำเร็จ</div>
                    <div className="text-lg font-black text-emerald-700">{billingResult.line_push_success} ห้อง</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-rose-500">ค้าง/ไม่มี LINE</div>
                    <div className="text-lg font-black text-rose-700">{billingResult.line_push_failed} ห้อง</div>
                  </div>
                </div>
                {billingResult.failed_rooms && billingResult.failed_rooms.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">ห้องที่ไม่มีการผูกไอดี LINE OA:</div>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {billingResult.failed_rooms.map((room: string) => (
                        <div key={room} className="text-[10px] bg-white border border-slate-100 px-2 py-1 rounded text-slate-500 font-semibold">
                          ⚠️ {room}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              billingResult.unpaid_rooms > 0 && (
                <button
                  disabled={sendingLine}
                  onClick={sendLineReminders}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:from-blue-400 disabled:to-indigo-500 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 text-sm mb-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sendingLine ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังจัดส่งข้อความผ่าน LINE OA...</span>
                    </>
                  ) : (
                    <>
                      <span>📲</span>
                      <span>ส่งใบแจ้งยอดเข้า LINE OA ({billingResult.unpaid_rooms} ห้อง)</span>
                    </>
                  )}
                </button>
              )
            )}

            <button
              onClick={() => setShowBilling(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition text-sm cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// Monthly Bar Chart Component
// ==========================================
const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function MonthlyChart() {
  const [data, setData] = useState<{month:string; income:number; expense:number}[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<{
    month: string;
    income: number;
    expense: number;
    x: number;
    y: number;
  } | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    authFetch(`${API_BASE}/transactions/monthly-summary`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, [API_BASE]);

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const monthIdx = parseInt(mo, 10) - 1;
    return `${THAI_MONTHS[monthIdx]} ${(parseInt(y) + 543).toString().slice(-2)}`;
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-base font-black text-slate-800">📊 แนวโน้มรายรับ-รายจ่าย</h3>
          <p className="text-xs text-slate-400 mt-0.5">6 เดือนล่าสุด</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">ยังไม่มีข้อมูลรายเดือน</div>
      ) : (
        <div className="overflow-x-auto relative">
          <svg viewBox={`0 0 ${Math.max(data.length * 120, 400)} 260`} className="w-full overflow-visible" style={{ minWidth: 350 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F87171" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
              <filter id="incomeGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10B981" floodOpacity="0.12" />
              </filter>
              <filter id="expenseGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#EF4444" floodOpacity="0.12" />
              </filter>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
              <g key={i}>
                <line x1="60" y1={220 - pct * 200} x2={data.length * 120 + 20} y2={220 - pct * 200}
                  stroke="#F1F5F9" strokeWidth="1" strokeDasharray={i > 0 && i < 4 ? "4 4" : "0"} />
                <text x="50" y={224 - pct * 200} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="black">
                  {(maxVal * pct / 1000).toFixed(0)}K
                </text>
              </g>
            ))}
            
            {/* Bars */}
            {data.map((d, i) => {
              const x = 70 + i * 110;
              const incomeH = (d.income / maxVal) * 200;
              const expenseH = (d.expense / maxVal) * 200;
              return (
                <g key={d.month} className="group">
                  {/* Income Bar */}
                  <rect x={x} y={220 - incomeH} width="36" height={incomeH} rx="6"
                    fill="url(#incomeGrad)" filter="url(#incomeGlow)" className="transition-all duration-300 transform origin-bottom hover:scale-y-[1.03] cursor-pointer" />
                  
                  {/* Expense Bar */}
                  <rect x={x + 42} y={220 - expenseH} width="36" height={expenseH} rx="6"
                    fill="url(#expenseGrad)" filter="url(#expenseGlow)" className="transition-all duration-300 transform origin-bottom hover:scale-y-[1.03] cursor-pointer" />
                  
                  {/* Month Label */}
                  <text x={x + 39} y={245} textAnchor="middle" fontSize="10" fill="#64748B" fontWeight="bold">
                    {formatMonth(d.month)}
                  </text>

                  {/* Interactive Big Hover Capture Box */}
                  <rect 
                    x={x - 8} 
                    y={10} 
                    width="96" 
                    height="215" 
                    fill="transparent" 
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveTooltip({
                        month: formatMonth(d.month),
                        income: d.income,
                        expense: d.expense,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8
                      });
                    }}
                    onMouseLeave={() => setActiveTooltip(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-[#34D399] to-[#059669] shadow-[0_2px_6px_rgba(16,185,129,0.25)]" /> รายรับ
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-[#F87171] to-[#EF4444] shadow-[0_2px_6px_rgba(239,68,68,0.25)]" /> รายจ่าย
            </div>
          </div>
        </div>
      )}

      {/* Floating Glassmorphic Tooltip Card */}
      {activeTooltip && (
        <div 
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-white/95 backdrop-blur-md border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl p-4 min-w-[190px] transition-all duration-120 ease-out"
          style={{ left: activeTooltip.x, top: activeTooltip.y }}
        >
          <div className="text-[11px] font-black text-slate-700 border-b border-slate-100 pb-2 mb-2 flex justify-between items-center">
            <span>🗓️ {activeTooltip.month}</span>
            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100/50">SUMMARY</span>
          </div>
          <div className="space-y-1.5 text-xs font-semibold text-slate-600">
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-[#34D399] to-[#059669] inline-block" /> รายรับ:
              </span>
              <span className="text-emerald-600 font-extrabold text-right">{activeTooltip.income.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-[#F87171] to-[#EF4444] inline-block" /> รายจ่าย:
              </span>
              <span className="text-rose-600 font-extrabold text-right">{activeTooltip.expense.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between items-center gap-4 pt-2 border-t border-slate-50 mt-1">
              <span className="text-slate-500 font-bold">กำไรสุทธิ:</span>
              <span className={`font-black ${activeTooltip.income - activeTooltip.expense >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {(activeTooltip.income - activeTooltip.expense).toLocaleString()} ฿
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
