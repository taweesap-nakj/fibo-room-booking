"use client";

import UserNav from "@/components/UserNav";
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
          <UserNav />

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