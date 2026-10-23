"use client";

import { useState } from "react";
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
  Cpu,
  X,
} from "lucide-react";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Search Rooms", href: "/search", icon: Search },
  { name: "Schedule", href: "/schedule", icon: CalendarRange, badge: "NEW" },
  { name: "My Booking", href: "/my-booking", icon: CalendarDays },
  { name: "Check In", href: "/check-in", icon: KeyRound },
];

const BOT_QUOTES = [
  "ยินดีต้อนรับสู่ระบบจองห้องปฏิบัติการ FIBO Robotics Lab คร้าบ!",
  "จองเสร็จอย่าลืมสแกน QR Code หน้าห้องภายใน 15 นาทีนะ!",
  "ลองกดปุ่ม 'AI Smart Match' ด้านบน ให้ระบบช่วยเลือกห้องที่เหมาะที่สุดได้นะ!",
  "เซนเซอร์อาคาร FIBO เชื่อมต่อฐานข้อมูลแบบ Real-time 100%",
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showBotTip, setShowBotTip] = useState(true);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);

  const isAuthOrKiosk = pathname === "/login" || pathname?.startsWith("/kiosk");

  const handleBotClick = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 450);
    setDialogueIndex((prev) => (prev + 1) % BOT_QUOTES.length);
    setShowBotTip(true);
  };

  if (isAuthOrKiosk) {
    return (
      <html lang="th">
        <head>
          <title>FIBO Smart Building | Room Reservation</title>
        </head>
        <body className="bg-slate-950 text-slate-100 font-sans antialiased">
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
      <body className="fibo-cyber-grid text-slate-800 font-sans antialiased">
        <div className="flex min-h-screen pb-20 lg:pb-0">
          {/* Sidebar สำหรับหน้าจอ Desktop */}
          <UserNav />

          {/* เนื้อหาหลักของแต่ละหน้า */}
          <div className="flex-1 overflow-x-hidden min-w-0">
            {children}
          </div>

          {/* น้องหุ่นยนต์ FIBO AI Bot (แสดงเฉพาะจอคอม/แท็บเล็ต) */}
          <div className="fixed bottom-6 right-6 z-40 hidden sm:flex items-end gap-3">
            {showBotTip && (
              <div className="fibo-glass-nav rounded-2xl p-3.5 max-w-[220px] text-xs shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-1 border-b border-slate-100 pb-1">
                  <span className="flex items-center gap-1 font-black text-[10px] text-orange-600 uppercase">
                    <Cpu className="w-3 h-3 text-orange-500" /> FIBO Bot
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBotTip(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-slate-700 text-[11px] leading-snug font-medium">
                  {BOT_QUOTES[dialogueIndex]}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleBotClick}
              className={`relative cursor-pointer transition-transform ${
                isBouncing ? "animate-bot-jump" : "hover:scale-105"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-900 p-2.5 shadow-xl border border-slate-700 flex items-center justify-center">
                <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
                  <circle cx="24" cy="7" r="3" fill="#EA580C" />
                  <line x1="24" y1="10" x2="24" y2="15" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
                  <rect x="8" y="15" width="32" height="26" rx="8" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                  <rect x="12" y="20" width="24" height="12" rx="4" fill="#0F172A" />
                  <circle cx="18" cy="26" r="3" fill="#38BDF8" />
                  <circle cx="30" cy="26" r="3" fill="#38BDF8" />
                  <path d="M20 36Q24 38 28 36" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </button>
          </div>

          {/* Navigation Bar ด้านล่างสำหรับหน้าจอมือถือ */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 fibo-glass-nav px-2 py-2 flex justify-around items-center z-40">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
                    isActive
                      ? "text-[#EA580C] bg-orange-500/10"
                      : "text-slate-400 hover:text-slate-600"
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