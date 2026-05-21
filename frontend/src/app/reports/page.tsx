"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useDormitoryData } from "@/lib/useDormitoryData";
import { useGarageData } from "@/lib/useGarageData";
import { useHouseData } from "@/lib/useHouseData";
import { useTransactionData } from "@/lib/useTransactionData";
import { fetchTransactionSummary } from "@/lib/api";

const REPORT_CARDS = [
  { label: "Frontend", value: "Next.js", tone: "bg-blue-50 text-blue-700 border-blue-100" },
  { label: "Backend", value: "FastAPI", tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { label: "Database", value: "SQLite / PostgreSQL-ready", tone: "bg-amber-50 text-amber-700 border-amber-100" },
  { label: "Integrations", value: "LINE OA / PromptPay", tone: "bg-indigo-50 text-indigo-700 border-indigo-100" },
];

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReportsPage() {
  const dorm = useDormitoryData();
  const garage = useGarageData();
  const house = useHouseData();
  const tx = useTransactionData();

  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${API_BASE}/transactions/monthly-summary`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMonthlyData(data);
        }
      })
      .catch((err) => console.error("Error loading monthly summary on reports:", err));
  }, []);

  const totals = useMemo(() => {
    const grossRevenue = dorm.grandExpectedRevenue + garage.totalRevenue + house.totalExpectedRevenue;
    const collected = dorm.grandPaidRevenue + garage.paidRevenue + house.paidRevenue;
    const pending = dorm.grandPendingRevenue + garage.pendingRevenue + house.pendingRevenue;
    const operating = tx.transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    return { grossRevenue, collected, pending, operating };
  }, [dorm, garage, house, tx.transactions]);

  const completion = totals.grossRevenue > 0 ? Math.round((totals.collected / totals.grossRevenue) * 100) : 0;

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3 inline-block">
            Reports & Analytics
          </span>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">รายงานวิเคราะห์ระบบรวม</h1>
          <p className="text-slate-500 text-sm mt-1">
            ภาพรวมธุรกิจหอพัก อู่ซ่อมรถ และบ้านเช่า พร้อมสถานะระบบและการเชื่อมต่อสำคัญ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transactions" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black shadow-lg">
            ดูบัญชี
          </Link>
          <Link href="/settings" className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black">
            ตั้งค่าระบบ
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="รายรับรวมทั้งหมด" value={totals.grossRevenue} tone="text-blue-600" />
        <StatCard label="เก็บเงินแล้ว" value={totals.collected} tone="text-emerald-600" />
        <StatCard label="ค้างชำระ" value={totals.pending} tone="text-rose-600" />
        <StatCard label="รายจ่ายระบบ" value={totals.operating} tone="text-amber-600" />
      </div>

      {/* ========== Premium Financial Trend Chart (SVG Line Chart) ========== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] space-y-4">
        <div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md mb-1.5 inline-block">
            SaaS Financial Analytics
          </span>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            📈 แนวโน้มรายรับ - รายจ่าย - กำไรสุทธิ เชิงบริหารย้อนหลัง 6 เดือน
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">แผนภูมิเส้นเรืองแสง (SVG Glow & Gradients Line Chart) วาดสดประสิทธิภาพสูง</p>
        </div>

        {monthlyData.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            📊 ยังไม่มีข้อมูลการเงินรายเดือนในระบบ
          </div>
        ) : (() => {
          const maxVal = Math.max(...monthlyData.flatMap(d => [d.income, d.expense, Math.abs(d.income - d.expense)]), 10000);
          
          const svgW = 700;
          const svgH = 320;
          const paddingL = 65;
          const paddingR = 40;
          const paddingT = 40;
          const paddingB = 60;
          
          const chartW = svgW - paddingL - paddingR;
          const chartH = svgH - paddingT - paddingB;
          
          // Generate points
          const incomePoints = monthlyData.map((d, i) => {
            const x = paddingL + i * (chartW / (monthlyData.length - 1));
            const y = paddingT + chartH - (d.income / maxVal) * chartH;
            return { x, y, value: d.income, month: d.month };
          });

          const expensePoints = monthlyData.map((d, i) => {
            const x = paddingL + i * (chartW / (monthlyData.length - 1));
            const y = paddingT + chartH - (d.expense / maxVal) * chartH;
            return { x, y, value: d.expense, month: d.month };
          });

          const profitPoints = monthlyData.map((d, i) => {
            const profit = Math.max(d.income - d.expense, 0);
            const x = paddingL + i * (chartW / (monthlyData.length - 1));
            const y = paddingT + chartH - (profit / maxVal) * chartH;
            return { x, y, value: profit, month: d.month };
          });

          const createPathD = (points: {x:number; y:number}[]) => {
            if (points.length === 0) return "";
            return points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, "");
          };

          const createAreaPathD = (points: {x:number; y:number}[]) => {
            if (points.length === 0) return "";
            const linePath = createPathD(points);
            const firstX = points[0].x;
            const lastX = points[points.length - 1].x;
            const baseY = paddingT + chartH;
            return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
          };

          const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
          const formatMonthStr = (m: string) => {
            const [y, mo] = m.split("-");
            const mIdx = parseInt(mo, 10) - 1;
            return `${THAI_MONTHS_SHORT[mIdx]} ${(parseInt(y) + 543).toString().slice(-2)}`;
          };

          return (
            <div className="overflow-x-auto w-full">
              <div className="min-w-[650px] relative">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto overflow-visible select-none">
                  {/* Definition of Gradients & Glow Filters */}
                  <defs>
                    {/* Glow filters */}
                    <filter id="glow-income" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glow-expense" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glow-profit" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Line gradients */}
                    <linearGradient id="grad-income" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="grad-expense" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                    <linearGradient id="grad-profit" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>

                    {/* Area gradients */}
                    <linearGradient id="area-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="area-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="area-profit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = paddingT + chartH - pct * chartH;
                    const val = maxVal * pct;
                    return (
                      <g key={i}>
                        <line x1={paddingL} y1={y} x2={svgW - paddingR} y2={y} stroke="#f1f5f9" strokeWidth="1.5" />
                        <text x={paddingL - 12} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" className="font-bold font-mono">
                          {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Y Axis line */}
                  <line x1={paddingL} y1={paddingT} x2={paddingL} y2={paddingT + chartH} stroke="#cbd5e1" strokeWidth="1" />

                  {/* Area Paths (Behind) */}
                  <path d={createAreaPathD(incomePoints)} fill="url(#area-income)" />
                  <path d={createAreaPathD(expensePoints)} fill="url(#area-expense)" />
                  <path d={createAreaPathD(profitPoints)} fill="url(#area-profit)" />

                  {/* Line Paths */}
                  <path d={createPathD(incomePoints)} fill="none" stroke="url(#grad-income)" strokeWidth="3.5" strokeLinecap="round" filter="url(#glow-income)" opacity="0.95" />
                  <path d={createPathD(expensePoints)} fill="none" stroke="url(#grad-expense)" strokeWidth="3.5" strokeLinecap="round" filter="url(#glow-expense)" opacity="0.95" />
                  <path d={createPathD(profitPoints)} fill="none" stroke="url(#grad-profit)" strokeWidth="3.5" strokeLinecap="round" filter="url(#glow-profit)" opacity="0.95" />

                  {/* Dots and Tooltips */}
                  {incomePoints.map((p, i) => (
                    <g key={`in-${i}`} className="group/dot">
                      <circle cx={p.x} cy={p.y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" className="drop-shadow-sm cursor-pointer hover:r-7 transition-all duration-150" />
                      <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="9" fill="#047857" className="font-extrabold font-mono opacity-0 group-hover/dot:opacity-100 transition-opacity bg-white">
                        {p.value.toLocaleString()} ฿
                      </text>
                    </g>
                  ))}

                  {expensePoints.map((p, i) => (
                    <g key={`ex-${i}`} className="group/dot">
                      <circle cx={p.x} cy={p.y} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" className="drop-shadow-sm cursor-pointer hover:r-7 transition-all duration-150" />
                      <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="9" fill="#be123c" className="font-extrabold font-mono opacity-0 group-hover/dot:opacity-100 transition-opacity bg-white">
                        {p.value.toLocaleString()} ฿
                      </text>
                    </g>
                  ))}

                  {profitPoints.map((p, i) => (
                    <g key={`pr-${i}`} className="group/dot">
                      <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="drop-shadow-sm cursor-pointer hover:r-7 transition-all duration-150" />
                      <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="9" fill="#1d4ed8" className="font-extrabold font-mono opacity-0 group-hover/dot:opacity-100 transition-opacity bg-white">
                        {p.value.toLocaleString()} ฿
                      </text>
                    </g>
                  ))}

                  {/* X Axis Month Labels */}
                  {monthlyData.map((d, i) => {
                    const x = paddingL + i * (chartW / (monthlyData.length - 1));
                    const y = paddingT + chartH + 25;
                    return (
                      <g key={i}>
                        <line x1={x} y1={paddingT + chartH} x2={x} y2={paddingT + chartH + 6} stroke="#cbd5e1" strokeWidth="1" />
                        <text x={x} y={y} textAnchor="middle" fontSize="10.5" fill="#64748b" className="font-black">
                          {formatMonthStr(d.month)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Custom interactive Legend & Summaries */}
              <div className="flex flex-wrap justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center text-white text-[9px]">✓</div>
                  <span>รายรับรวม (Revenue)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-400 flex items-center justify-center text-white text-[9px]">✓</div>
                  <span>รายจ่ายระบบ (Expense)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-blue-400 flex items-center justify-center text-white text-[9px]">✓</div>
                  <span>กำไรสุทธิ (Net Profit)</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="สถานะการเก็บเงินรวม" subtitle={`สำเร็จ ${completion}% ของยอดทั้งหมด`}>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${completion}%` }} />
            <div className="bg-rose-400 h-full" style={{ width: `${Math.max(100 - completion, 0)}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
            <MiniMetric label="หอพัก" value={dorm.grandPaidRevenue} />
            <MiniMetric label="อู่ซ่อมรถ" value={garage.paidRevenue} />
            <MiniMetric label="บ้านเช่า" value={house.paidRevenue} />
          </div>
        </Panel>

        <Panel title="Roadmap ความพร้อมของระบบ" subtitle="สิ่งที่มีแล้วและจุดที่ยังควรต่อยอด">
          <div className="space-y-3">
            {[
              ["Core accounting", true, "มีบัญชี รายรับ-รายจ่าย และสรุป dashboard"],
              ["Dormitory workflow", true, "มีการจัดการห้อง ค่าน้ำค่าไฟ และใบแจ้งหนี้"],
              ["Garage workflow", true, "มีการเพิ่มงานซ่อม ออกใบเสร็จ และสถานะงาน"],
              ["House workflow", true, "มีการติดตามผู้เช่าและสถานะจ่ายเงิน"],
              ["Reports & analytics", true, "มีหน้ารายงานเชิงบริหารแล้ว"],
              ["Role management", false, "ยังเป็น admin flow แบบง่าย"],
              ["Audit log", false, "ควรมีบันทึกประวัติการแก้ไข"],
              ["Cloud sync / deployment", false, "ควรผูก storage และ backup"],
            ].map(([label, done, desc]) => (
              <div key={label as string} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                  {done ? "✓" : "!"}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800">{label as string}</div>
                  <div className="text-[11px] text-slate-500">{desc as string}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Architecture Snapshot" subtitle="ภาพรวมสถาปัตยกรรมระบบ">
          <div className="grid grid-cols-2 gap-3 text-center">
            {REPORT_CARDS.map((item) => (
              <div key={item.label} className={`rounded-2xl border p-3 ${item.tone}`}>
                <div className="text-[10px] font-black uppercase tracking-wider">{item.label}</div>
                <div className="mt-1 text-sm font-black">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-500 leading-6">
            Frontend ดึงข้อมูลจาก API, Backend จัดการห้อง/งานซ่อม/บ้านเช่า และฐานข้อมูลเก็บรายการธุรกรรมทั้งหมด
            พร้อมรองรับ LINE OA และ PromptPay ตาม roadmap
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Data Flow" subtitle="เส้นทางข้อมูลจากผู้ใช้สู่ฐานข้อมูล">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-xs">
            {["ลูกค้า / เจ้าหน้าที่", "Frontend Web", "Backend API", "Database", "LINE / PromptPay"].map((step, idx) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="w-7 h-7 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                <div className="mt-2 font-bold text-slate-700">{step}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Operational KPIs" subtitle="ตัวชี้วัดการใช้งานและการเงิน">
          <div className="grid grid-cols-2 gap-3">
            <MiniMetric label="ห้องพักทั้งหมด" value={dorm.totalRooms} suffix="ห้อง" />
            <MiniMetric label="อัตราการเช่า" value={dorm.occupancyRate} suffix="%" />
            <MiniMetric label="งานอู่ทั้งหมด" value={garage.totalJobs} suffix="คัน" />
            <MiniMetric label="บ้านเช่าทั้งหมด" value={house.totalHouses} suffix="หลัง" />
          </div>
          <div className="mt-4 text-xs text-slate-500 leading-6">
            รายงานหน้านี้ช่วยให้ผู้บริหารเห็นสถานะทรัพย์สิน การเก็บเงิน และจุดที่ต้องลงทุนเพิ่มเติมในระบบ
          </div>
        </Panel>
      </div>

      <Panel title="สรุปข้อเสนอแนะ" subtitle="สิ่งที่ควรทำต่อเพื่อให้ครบตาม roadmap">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            "เพิ่มหน้า Users / Roles / Permissions",
            "ทำ Audit log และประวัติการแก้ไข",
            "เชื่อม LINE OA notification แบบ full flow",
            "ทำ Backup / Restore และสถานะการซิงก์",
            "ต่อยอด Payment Gateway / PromptPay จริง",
            "เพิ่มรายงานกราฟรายเดือนและ export รายงาน",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-emerald-500">✓</span>
              <span className="font-semibold text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</div>
      <div className={`mt-1 text-2xl font-black ${tone}`}>{formatMoney(value)} ฿</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="mb-4">
        <h2 className="text-base font-black text-slate-800">{title}</h2>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function MiniMetric({ label, value, suffix = "฿" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-800">
        {typeof value === "number" ? value.toLocaleString("th-TH") : value} <span className="text-xs text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}
