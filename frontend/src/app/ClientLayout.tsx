"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from 'next/link';
import SidebarLinks from "./SidebarLinks";
import { useAuth } from "@/lib/useAuth";
import { useEffect } from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isAuthenticated === false && !isLoginPage) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoginPage, router]);

  if (isLoginPage) {
    return <div className="w-full min-h-screen">{children}</div>;
  }

  // Prevent flash of protected content by rendering a premium dark loading spinner during checks
  if (isAuthenticated === null) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#0a0e27]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-semibold tracking-wide">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Render a blank screen to block unauthorized renders before redirection completes
  if (isAuthenticated === false) {
    return <div className="w-full min-h-screen bg-[#0a0e27]" />;
  }

  return (
    <>
      {/* Premium Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40">
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-600/20 group-hover:shadow-blue-600/40 transition-all duration-300">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[15px] tracking-tight text-slate-900 leading-tight">Sovereign</span>
              <span className="text-[11px] font-bold text-blue-600 tracking-widest uppercase">System</span>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
          <SidebarLinks />
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => {
              if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
                logout();
              }
            }}
            title="คลิกเพื่อออกจากระบบ"
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-red-50 text-slate-700 hover:text-red-600 transition group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700 group-hover:bg-red-100 group-hover:text-red-700 transition font-bold text-sm">
                AD
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold">Admin User</span>
                <span className="text-[10px] text-slate-500">Owner</span>
              </div>
            </div>
            <svg className="w-4 h-4 opacity-40 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700">
              <span className="text-white font-bold text-sm select-none">S</span>
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">Sovereign</span>
          </div>
          <button className="text-slate-500 hover:bg-slate-100 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
