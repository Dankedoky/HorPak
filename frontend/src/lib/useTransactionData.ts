import { useState, useEffect } from "react";

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
      const response = await fetch("http://localhost:8000/transactions/");
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
