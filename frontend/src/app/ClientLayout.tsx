"use client";

import { usePathname } from "next/navigation";
import Link from 'next/link';
import SidebarLinks from "./SidebarLinks";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div className="w-full min-h-screen">{children}</div>;
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
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700 font-bold text-sm">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">Admin User</span>
              <span className="text-[10px] text-slate-500">Owner</span>
            </div>
          </div>
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
