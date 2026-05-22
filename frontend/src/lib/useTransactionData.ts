import { useState, useEffect } from "react";
import { authFetch } from "./api";

export enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
}

export interface BusinessUnit {
  id: number;
  name: string;
  type: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  unit_id: number | null;
  created_at: string;
  unit?: BusinessUnit;
  reference_id?: string | null;
}

export interface TransactionDashboard {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTransactionData(): TransactionDashboard {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await authFetch(`${apiBase}/transactions/`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      setTransactions(data);
      setError(null);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => fetchTransactions(), 0);
  }, []);

  return {
    transactions,
    isLoading,
    error,
    refresh: fetchTransactions,
  };
}
