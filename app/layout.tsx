"use client";

import { useState, useEffect } from "react";
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
  "จองเสร็จอย่าลืมสแกน QR Code หน้าห้องภายใน 15 นาที เพื่อไม่ให้ห้องหลุดนะ!",
  "ห้อง FB201 และ FB202 ชั้น 2 สัญญาณเน็ตแรงและแอร์เย็น เหมาะกับการติวหนังสือมากครับ",
  "ทิป: ลองกดปุ่ม '⚡ AI Smart Match' ด้านบน ให้ระบบช่วยเลือกห้องที่เหมาะที่สุดได้นะ!",
  "เซนเซอร์อาคาร FIBO เชื่อมต่อ Supabase Live Database แบบ Real-time 100%",
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showBotTip, setShowBotTip] = useState(true);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [botMood, setBotMood] = useState<"happy" | "radar" | "star">("happy");
  const [isBouncing, setIsBouncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthOrKiosk = pathname === "/login" || pathname?.startsWith("/kiosk");

  const handleBotInteract = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 550);

    setDialogueIndex((prev) => (prev + 1) % BOT_QUOTES.length);
    setShowBotTip(true);

    const moods: ("happy" | "radar" | "star")[] = ["happy", "radar", "star"];
    setBotMood(moods[(dialogueIndex + 1) % moods.length]);
  };

  return (
    <html
      lang="th"
      translate="no"
      className="notranslate"
      suppressHydrationWarning
    >
      <head>
        <title>FIBO Smart Building | Room Reservation</title>
        <meta name="google" content="notranslate" />
      </head>
      <body
        suppressHydrationWarning
        className={`${
          isAuthOrKiosk
            ? "bg-slate-950 text-slate-100"
            : "bg-[#f8fafc] text-slate-800 fibo-cyber-grid"
        } font-sans antialiased selection:bg-orange-500 selection:text-white overflow-x-hidden`}
      >
        {!isAuthOrKiosk && (
          <>
            {/* Dynamic Ambient Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-400/15 rounded-full blur-3xl animate-ambient-pulse" />
              <div
                className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] bg-sky-400/15 rounded-full blur-3xl animate-ambient-pulse"
                style={{ animationDelay: "-6s" }}
              />
              <div
                className="absolute -bottom-24 left-1/3 w-80 h-80 bg-amber-300/10 rounded-full blur-3xl animate-ambient-pulse"
                style={{ animationDelay: "-3s" }}
              />
            </div>

            {/* Interactive FIBO AI Bot Companion */}
            {mounted && (
              <aside
                aria-label="FIBO Assistant"
                className="fixed bottom-6 right-6 z-40 hidden sm:flex items-end gap-3 pointer-events-auto"
              >
                {showBotTip && (
                  <div className="fibo-glass-nav rounded-2xl p-3.5 max-w-[230px] text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-slate-100 pb-1">
                      <span className="flex items-center gap-1 font-black text-[10px] text-orange-600 uppercase tracking-wider">
                        <Cpu className="w-3 h-3 text-orange-500" /> FIBO AI Bot
                      </span>
                      <button
                        onClick={() => setShowBotTip(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-snug font-medium">
                      {BOT_QUOTES[dialogueIndex]}
                    </p>
                    <span className="block text-[9px] text-slate-400 mt-1 italic">
                      (คลิกตัวหุ่นยนต์เพื่อฟังคำแนะนำถัดไป)
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBotInteract}
                  title="คลิกคุยกับ FIBO Bot"
                  className={`relative group cursor-pointer transition-transform ${
                    isBouncing ? "animate-bot-jump" : "hover:scale-110 active:scale-95"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-2.5 shadow-2xl border border-slate-700/60 flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="24" cy="7" r="3" fill="#EA580C" />
                      <line x1="24" y1="10" x2="24" y2="15" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
                      <rect x="8" y="15" width="32" height="26" rx="8" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                      <rect x="12" y="20" width="24" height="12" rx="4" fill="#0F172A" />

                      {botMood === "happy" && (
                        <>
                          <path d="M16 26C16 23.5 19 23.5 19 26" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M29 26C29 23.5 32 23.5 32 26" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
                        </>
                      )}
                      {botMood === "radar" && (
                        <>
                          <circle cx="18" cy="26" r="3" fill="#F59E0B" className="animate-ping" />
                          <circle cx="18" cy="26" r="3" fill="#F59E0B" />
                          <circle cx="30" cy="26" r="3" fill="#F59E0B" />
                        </>
                      )}
                      {botMood === "star" && (
                        <>
                          <path d="M18 24L19 26L21 26.5L19.5 28L20 30L18 29L16 30L16.5 28L15 26.5L17 26Z" fill="#38BDF8" />
                          <path d="M30 24L31 26L33 26.5L31.5 28L32 30L30 29L28 30L28.5 28L27 26.5L29 26Z" fill="#38BDF8" />
                        </>
                      )}

                      <path d="M20 36Q24 38 28 36" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                  </span>
                </button>
              </aside>
            )}
          </>
        )}

        {/* Layout Body */}
        <div className="flex min-h-screen pb-24 lg:pb-0">
          {!isAuthOrKiosk && <UserNav />}
          <div className="flex-1 overflow-x-hidden min-w-0">
            {children}
          </div>

          {!isAuthOrKiosk && (
            <nav className="lg:hidden fixed bottom-3 inset-x-3 sm:inset-x-8 fibo-glass-nav rounded-2xl px-3 py-2 flex justify-around items-center z-40 transition-all">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
                      isActive
                        ? "bg-orange-500/10 text-[#EA580C] shadow-xs border border-orange-500/20 scale-105"
                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                    <span className="tracking-tight">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </body>
    </html>
  );
}