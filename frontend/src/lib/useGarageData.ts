import { useState, useEffect } from "react";

export interface GarageJob {
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

export interface GarageDashboard {
  jobs: GarageJob[];
  totalJobs: number;
  activeJobs: number;
  finishedJobs: number;
  pickedUpJobs: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  statusDistribution: { label: string; value: number; color: string }[];
  recentJobs: GarageJob[];
}

const STATUS_COLORS = {
  pending: "#94a3b8",      // slate-400
  in_progress: "#3b82f6",  // blue-500
  finished: "#10b981",     // emerald-500
  picked_up: "#6366f1",    // indigo-500
};

const STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังซ่อม",
  finished: "ซ่อมเสร็จแล้ว",
  picked_up: "รับรถแล้ว",
};

import { fetchGarageJobs } from "./api";

export function useGarageData(): GarageDashboard {
  const [data, setData] = useState<GarageDashboard>({
    jobs: [],
    totalJobs: 0,
    activeJobs: 0,
    finishedJobs: 0,
    pickedUpJobs: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    statusDistribution: [],
    recentJobs: [],
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const jobs = await fetchGarageJobs();
        
        const totalJobs = jobs.length;
        const activeJobs = jobs.filter(j => j.status === "pending" || j.status === "in_progress").length;
        const finishedJobs = jobs.filter(j => j.status === "finished").length;
        const pickedUpJobs = jobs.filter(j => j.status === "picked_up").length;
        
        const totalRevenue = jobs.reduce((sum, j) => sum + j.totalCost, 0);
        const paidRevenue = jobs.reduce((sum, j) => sum + (j.paymentStatus === "paid" ? j.totalCost : 0), 0);
        const pendingRevenue = totalRevenue - paidRevenue;

        const distribution = Object.entries(STATUS_COLORS).map(([status, color]) => ({
          label: STATUS_LABELS[status],
          value: jobs.filter(j => j.status === status).length,
          color,
        })).filter(d => d.value > 0);

        const finalDist = distribution.length > 0 ? distribution : [
            { label: "ไม่มีข้อมูล", value: 1, color: "#f1f5f9" }
        ];

        if (active) {
          setData({
            jobs,
            totalJobs,
            activeJobs,
            finishedJobs,
            pickedUpJobs,
            totalRevenue,
            paidRevenue,
            pendingRevenue,
            statusDistribution: finalDist,
            recentJobs: jobs.slice(0, 5),
          });
        }
      } catch (e) {
        console.error("Failed to load garage jobs in hook:", e);
      }
    };

    load();
    const handleSync = () => { load(); };
    window.addEventListener("storage", handleSync);
    return () => {
      active = false;
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  return data;
}
