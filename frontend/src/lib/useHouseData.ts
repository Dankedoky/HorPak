import { useState, useEffect } from "react";

export interface RentalHouse {
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

export interface HouseDashboard {
  houses: RentalHouse[];
  totalHouses: number;
  occupiedHouses: number;
  vacantHouses: number;
  totalExpectedRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  occupancyRate: number;
  recentPayments: RentalHouse[];
  pendingPayments: RentalHouse[];
}

import { fetchRentalHouses } from "./api";

export function useHouseData(): HouseDashboard {
  const [data, setData] = useState<HouseDashboard>({
    houses: [],
    totalHouses: 0,
    occupiedHouses: 0,
    vacantHouses: 0,
    totalExpectedRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    occupancyRate: 0,
    recentPayments: [],
    pendingPayments: [],
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const houses = await fetchRentalHouses();
        
        const totalHouses = houses.length;
        const occupiedHouses = houses.filter(h => h.tenantName && h.tenantName.trim() !== "").length;
        const vacantHouses = totalHouses - occupiedHouses;
        
        const totalExpectedRevenue = houses.reduce((sum, h) => sum + h.monthlyRent + h.waterBill + h.electricBill, 0);
        const paidRevenue = houses.reduce((sum, h) => sum + (h.paymentStatus === "paid" ? (h.monthlyRent + h.waterBill + h.electricBill) : 0), 0);
        const pendingRevenue = totalExpectedRevenue - paidRevenue;

        if (active) {
          setData({
            houses,
            totalHouses,
            occupiedHouses,
            vacantHouses,
            totalExpectedRevenue,
            paidRevenue,
            pendingRevenue,
            occupancyRate: totalHouses > 0 ? Math.round((occupiedHouses / totalHouses) * 100) : 0,
            recentPayments: houses.filter(h => h.paymentStatus === "paid").slice(0, 3),
            pendingPayments: houses.filter(h => h.paymentStatus === "unpaid" && h.tenantName !== "").slice(0, 3),
          });
        }
      } catch (e) {
        console.error("Failed to load rental houses in hook:", e);
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
