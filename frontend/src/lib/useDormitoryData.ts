import { useState, useEffect } from "react";

export interface Room {
  id?: number;
  dormKey?: string;
  number: string;
  rate: number;
  floor: number;
  tenant?: string;
  waterCost?: number;
  electricCost?: number;
  cleaningFee?: number;
  otherFee?: number;
  fineCost?: number;
  paymentStatus?: "pending" | "paid" | string;
  waterMeterPrev?: number;
  waterMeter?: number;
  electricityMeterPrev?: number;
  electricityMeter?: number;
  lateDays?: number;
  paymentDate?: string;
  remark?: string;
  moveOut?: string;
  vacant?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  deposit?: number;
  leaseStatus?: "active" | "expired" | "terminated" | string;
}

export interface DormStat {
  key: string;
  label: string;
  rooms: Room[];
  totalRooms: number;
  occupied: number;
  vacant: number;
  expectedRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  waterRevenue: number;
  electricRevenue: number;
}

export interface DormitoryDashboard {
  dorms: DormStat[];
  allRooms: Room[];
  totalRooms: number;
  totalOccupied: number;
  totalVacant: number;
  grandExpectedRevenue: number;
  grandPaidRevenue: number;
  grandPendingRevenue: number;
  grandWaterRevenue: number;
  grandElectricRevenue: number;
  occupancyRate: number;
  recentPaidRooms: (Room & { dormLabel: string })[];
  recentPendingRooms: (Room & { dormLabel: string })[];
}

function calcDormStat(key: string, label: string, rooms: Room[]): DormStat {
  const occupied = rooms.filter(r => r.tenant && r.tenant.trim() !== "").length;
  const vacant = rooms.length - occupied;

  const expectedRevenue = rooms.reduce((sum, r) => {
    if (!r.tenant || r.tenant.trim() === "") return sum;
    return sum + r.rate + (r.waterCost || 0) + (r.electricCost || 0) + (r.cleaningFee || 0) + (r.otherFee || 0) + (r.fineCost || 0);
  }, 0);

  const paidRevenue = rooms.reduce((sum, r) => {
    if (!r.tenant || r.tenant.trim() === "" || r.paymentStatus !== "paid") return sum;
    return sum + r.rate + (r.waterCost || 0) + (r.electricCost || 0) + (r.cleaningFee || 0) + (r.otherFee || 0) + (r.fineCost || 0);
  }, 0);

  const waterRevenue = rooms.reduce((sum, r) => sum + (r.waterCost || 0), 0);
  const electricRevenue = rooms.reduce((sum, r) => sum + (r.electricCost || 0), 0);

  return {
    key,
    label,
    rooms,
    totalRooms: rooms.length,
    occupied,
    vacant,
    expectedRevenue,
    paidRevenue,
    pendingRevenue: expectedRevenue - paidRevenue,
    waterRevenue,
    electricRevenue,
  };
}

const DEFAULT_ROOMS_26_20: Room[] = [
  { number: "401", rate: 2800, floor: 4 }, { number: "402", rate: 2500, floor: 4 },
  { number: "403", rate: 2500, floor: 4 }, { number: "404", rate: 2200, floor: 4 },
  { number: "405", rate: 2500, floor: 4 }, { number: "406", rate: 2500, floor: 4 },
  { number: "301", rate: 2800, floor: 3 }, { number: "302", rate: 2500, floor: 3 },
  { number: "303", rate: 2500, floor: 3 }, { number: "304", rate: 3000, floor: 3 },
  { number: "305", rate: 2800, floor: 3 }, { number: "306", rate: 2800, floor: 3 },
  { number: "307", rate: 3000, floor: 3 },
  { number: "201", rate: 3000, floor: 2 }, { number: "202", rate: 2800, floor: 2 },
  { number: "203", rate: 2800, floor: 2 }, { number: "204", rate: 3000, floor: 2 },
  { number: "205", rate: 2800, floor: 2 }, { number: "206", rate: 2500, floor: 2 },
  { number: "207", rate: 2700, floor: 2 },
  { number: "101", rate: 2500, floor: 1 }, { number: "102", rate: 2500, floor: 1 },
  { number: "103", rate: 2500, floor: 1 }, { number: "104", rate: 2500, floor: 1 },
].map(r => ({ ...r, tenant: "", paymentStatus: "pending" as const }));

const DEFAULT_ROOMS_26_577: Room[] = Array.from({ length: 10 }, (_, i) => ({ number: `3${String(i + 1).padStart(2, "0")}`, rate: 2500, floor: 3 }))
  .concat(Array.from({ length: 10 }, (_, i) => ({ number: `2${String(i + 1).padStart(2, "0")}`, rate: 2500, floor: 2 })))
  .concat([
    { number: "101", rate: 2500, floor: 1 }, { number: "102", rate: 2500, floor: 1 },
    { number: "103", rate: 2500, floor: 1 }, { number: "104", rate: 2000, floor: 1 },
    { number: "105", rate: 2500, floor: 1 }, { number: "106", rate: 2500, floor: 1 },
    { number: "107", rate: 2500, floor: 1 }, { number: "108", rate: 2500, floor: 1 },
    { number: "109", rate: 2500, floor: 1 }, { number: "110", rate: 2500, floor: 1 },
  ]).map(r => ({ ...r, tenant: "", paymentStatus: "pending" as const }));

const DEFAULT_ROOMS_73_17: Room[] = [
  { number: "B1", rate: 3500, floor: 2 }, { number: "B2", rate: 3500, floor: 2 },
  { number: "B3", rate: 3500, floor: 2 }, { number: "B4", rate: 3500, floor: 2 },
  { number: "B5", rate: 3500, floor: 2 }, { number: "B6", rate: 3500, floor: 2 },
  { number: "B7", rate: 3500, floor: 2 }, { number: "B8", rate: 3500, floor: 2 },
  { number: "B9", rate: 3500, floor: 2 },
  { number: "A1", rate: 3500, floor: 1 }, { number: "A2", rate: 3500, floor: 1 },
  { number: "A3", rate: 3500, floor: 1 }, { number: "A4", rate: 3500, floor: 1 },
  { number: "A5", rate: 3500, floor: 1 }, { number: "A6", rate: 3500, floor: 1 },
  { number: "A7", rate: 3500, floor: 1 }, { number: "A8", rate: 3500, floor: 1 },
].map(r => ({ ...r, tenant: "", paymentStatus: "pending" as const }));

import { fetchDormRooms } from "./api";

export function useDormitoryData(): DormitoryDashboard {
  const [data, setData] = useState<DormitoryDashboard>(() => buildDashboard(
    DEFAULT_ROOMS_26_20,
    DEFAULT_ROOMS_26_577,
    DEFAULT_ROOMS_73_17,
  ));

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rooms = await fetchDormRooms();
        if (!rooms || rooms.length === 0) return;
        
        const r26_20 = rooms.filter(r => r.dormKey === "26_20");
        const r26_577 = rooms.filter(r => r.dormKey === "26_577");
        const r73_17 = rooms.filter(r => r.dormKey === "73_17");
        
        if (active) {
          setData(buildDashboard(r26_20, r26_577, r73_17));
        }
      } catch (e) {
        console.error("Failed to load backend dormitory data:", e);
      }
    };

    load();
    
    // Periodically sync dashboard or rely on mount, plus keep storage fallback trigger for cross-tab sync if needed
    const handleSync = () => { load(); };
    window.addEventListener("storage", handleSync);
    return () => {
      active = false;
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  return data;
}

function buildDashboard(r26_20: Room[], r26_577: Room[], r73_17: Room[]): DormitoryDashboard {
  const dorms = [
    calcDormStat("26_20", "หอ 26/20", r26_20),
    calcDormStat("26_577", "หอ 26/577", r26_577),
    calcDormStat("73_17", "หอ 73/17", r73_17),
  ];

  const allRooms = [...r26_20, ...r26_577, ...r73_17];
  const totalRooms = allRooms.length;
  const totalOccupied = dorms.reduce((s, d) => s + d.occupied, 0);
  const grandExpectedRevenue = dorms.reduce((s, d) => s + d.expectedRevenue, 0);
  const grandPaidRevenue = dorms.reduce((s, d) => s + d.paidRevenue, 0);
  const grandWaterRevenue = dorms.reduce((s, d) => s + d.waterRevenue, 0);
  const grandElectricRevenue = dorms.reduce((s, d) => s + d.electricRevenue, 0);

  // Recent paid rooms (has tenant + paid)
  const withLabel = (rooms: Room[], dormLabel: string) =>
    rooms.map(r => ({ ...r, dormLabel }));

  const recentPaidRooms = [
    ...withLabel(r26_20, "หอ 26/20"),
    ...withLabel(r26_577, "หอ 26/577"),
    ...withLabel(r73_17, "หอ 73/17"),
  ].filter(r => r.tenant && r.tenant.trim() !== "" && r.paymentStatus === "paid").slice(0, 5);

  const recentPendingRooms = [
    ...withLabel(r26_20, "หอ 26/20"),
    ...withLabel(r26_577, "หอ 26/577"),
    ...withLabel(r73_17, "หอ 73/17"),
  ].filter(r => r.tenant && r.tenant.trim() !== "" && r.paymentStatus !== "paid").slice(0, 5);

  return {
    dorms,
    allRooms,
    totalRooms,
    totalOccupied,
    totalVacant: totalRooms - totalOccupied,
    grandExpectedRevenue,
    grandPaidRevenue,
    grandPendingRevenue: grandExpectedRevenue - grandPaidRevenue,
    grandWaterRevenue,
    grandElectricRevenue,
    occupancyRate: totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0,
    recentPaidRooms,
    recentPendingRooms,
  };
}
