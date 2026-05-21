import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setTimeout(() => setIsAuthenticated(false), 0);
    } else {
      setTimeout(() => setIsAuthenticated(true), 0);
    }
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('auth_token', data.access_token);
        setTimeout(() => setIsAuthenticated(true), 0);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setTimeout(() => setIsAuthenticated(false), 0);
    router.push('/login');
  };

  return { isAuthenticated, login, logout };
}
