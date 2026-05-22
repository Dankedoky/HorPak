import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Sovereign Accounting",
  description: "Internal accounting system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#F4F7FA] text-slate-800 font-sans selection:bg-blue-500/30 selection:text-blue-900 flex">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

