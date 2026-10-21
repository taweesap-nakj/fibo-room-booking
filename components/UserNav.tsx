"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Search,
  Calendar,
  BookOpen,
  KeyRound,
  Monitor,
  ShieldAlert,
} from "lucide-react";

export default function UserNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const email = session.user.email || "";

      // ตรวจสอบ Role จาก profiles หรืออีเมล Admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const admin =
        email === "admin@fibo.kmutt.ac.th" ||
        profile?.role === "admin" ||
        session.user.user_metadata?.role === "admin";

      setIsAdmin(admin);
    };

    checkRole();
  }, [pathname]);

  const navItems = [
    { href: "/", label: "Home", icon: Building2 },
    { href: "/search", label: "Search Rooms", icon: Search },
    { href: "/schedule", label: "Schedule", icon: Calendar, badge: "LIVE" },
    {
      href: "/my-booking",
      label: isAdmin ? "All Bookings (Admin)" : "My Booking",
      icon: BookOpen,
    },
    { href: "/check-in", label: "Check In", icon: KeyRound },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] text-white flex-col justify-between hidden lg:flex shrink-0 min-h-screen">
      <div className="p-6 space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EA580C] flex items-center justify-center font-black text-lg shadow-lg shadow-orange-600/30">
            FB
          </div>
          <div>
            <h1 className="font-black text-sm tracking-wide">FIBO SMART SPACE</h1>
            <p className="text-[11px] text-slate-400">Room Reservation System</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                  isActive
                    ? "bg-[#EA580C] text-white shadow-md shadow-orange-600/20"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" /> {item.label}
                </span>
                {item.badge && (
                  <span className="text-[9px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-black">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Admin Controls Section */}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-800 space-y-1.5">
              <span className="px-4 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                Admin Controls
              </span>
              <Link
                href="/kiosk"
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-colors ${
                  pathname === "/kiosk"
                    ? "bg-orange-600 text-white"
                    : "text-orange-300 hover:bg-orange-500/10"
                }`}
              >
                <Monitor className="w-4 h-4" /> เปิดจอ Kiosk หน้าห้อง
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-800 text-[11px] text-slate-400">
        <p className="font-bold text-slate-200">FIBO KMUTT</p>
        <p>สถาบันวิทยาการหุ่นยนต์ภาคสนาม</p>
      </div>
    </aside>
  );
}