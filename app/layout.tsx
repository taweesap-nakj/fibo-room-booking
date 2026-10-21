"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  CalendarRange,
  CalendarDays,
  KeyRound,
} from "lucide-react";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Search Rooms", href: "/search", icon: Search },
  { name: "Schedule", href: "/schedule", icon: CalendarRange, badge: "NEW" },
  { name: "My Booking", href: "/my-booking", icon: CalendarDays },
  { name: "Check In", href: "/check-in", icon: KeyRound },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ไม่แสดง Sidebar และ Navigation Bar ในหน้า Login หรือหน้า Kiosk
  const isAuthOrKiosk = pathname === "/login" || pathname?.startsWith("/kiosk");

  if (isAuthOrKiosk) {
    return (
      <html lang="th">
        <head>
          <title>FIBO Smart Building | Room Reservation</title>
        </head>
        <body className="bg-slate-900 text-slate-100 font-sans antialiased">
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="th">
      <head>
        <title>FIBO Smart Building | Room Reservation</title>
      </head>
      <body className="bg-[#F8FAFC] text-slate-800 font-sans antialiased">
        <div className="flex min-h-screen pb-16 lg:pb-0 bg-[#F8FAFC]">
          {/* Sidebar สำหรับหน้าจอ Desktop */}
          <aside className="w-64 bg-slate-900 border-r border-slate-800 p-5 hidden lg:flex flex-col justify-between shrink-0">
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-600/30">
                  FB
                </div>
                <div>
                  <h1 className="font-black text-sm tracking-tight text-white leading-tight">
                    FIBO SMART SPACE
                  </h1>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Room Reservation System
                  </p>
                </div>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[#EA580C] text-white shadow-md shadow-orange-600/25"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-black">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl text-[11px] text-slate-400">
              <p className="font-bold text-slate-200">FIBO KMUTT</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                สถาบันวิทยาการหุ่นยนต์ภาคสนาม
              </p>
            </div>
          </aside>

          {/* เนื้อหาหลักของแต่ละหน้า */}
          <div className="flex-1 overflow-x-hidden min-w-0">
            {children}
          </div>

          {/* Navigation Bar ด้านล่างสำหรับหน้าจอมือถือ */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 flex justify-around items-center z-40 shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
                    isActive ? "text-[#EA580C]" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </body>
    </html>
  );
}