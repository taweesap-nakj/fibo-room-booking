"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  KeyRound,
  Monitor,
  CheckCircle2,
  Copy,
} from "lucide-react";

export default function BookingConfirmedPage() {
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestBooking = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          setIsLoading(false);
          return;
        }

        // ดึงรายการจองล่าสุดของผู้ใช้นี้
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("email", session.user.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          setBooking(data);
        }
      } catch (err) {
        console.error("Fetch latest booking error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestBooking();
  }, []);

  const formatDisplayTime = (isoOrTime: string) => {
    if (!isoOrTime) return "--:--";
    if (isoOrTime.includes("T")) {
      const d = new Date(isoOrTime);
      return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return isoOrTime;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-500 font-bold text-xs">
        กำลังโหลดข้อมูลการจอง...
      </div>
    );
  }

  const roomName = booking?.room_id || "FB201";
  const floorNum = roomName.match(/\d+/)?.[0]?.[0] || "2";
  const startTimeDisplay = formatDisplayTime(booking?.start_time);
  const endTimeDisplay = formatDisplayTime(booking?.end_time);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header Pass */}
        <div className="bg-gradient-to-r from-slate-900 to-orange-600 px-6 sm:px-8 py-5 flex items-center justify-between text-white">
          <span className="text-xs sm:text-sm font-black tracking-wider uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> FIBO OFFICIAL BOOKING PASS
          </span>
          <span className="text-xs font-mono font-bold bg-white/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            #{booking?.id ? booking.id.slice(0, 8).toUpperCase() : "BK-LIVE"}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                ห้องที่จอง
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">{roomName}</h2>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                {booking?.title || "การประชุมโปรเจกต์"}
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center min-w-[110px]">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">
                รหัส PIN หน้าห้อง
              </span>
              <span className="text-2xl sm:text-3xl font-black text-orange-600 font-mono tracking-widest">
                {roomName.replace(/\D/g, "") || "201"}
              </span>
            </div>
          </div>

          {/* Grid ข้อมูลเวลาจริง */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">วันที่</p>
                <p className="text-xs font-bold text-slate-800">{booking?.date || "Today"}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">ช่วงเวลา</p>
                <p className="text-xs font-bold text-slate-800">
                  {startTimeDisplay} – {endTimeDisplay} ({booking?.duration_hours || 1} ชม.)
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">ตำแหน่ง</p>
                <p className="text-xs font-bold text-slate-800">ชั้น {floorNum} ตึก FIBO</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              ⚠️ เงื่อนไขการเข้าใช้งาน (15-Minute Auto-Release):
            </p>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              กรุณาสแกน QR Code หน้าจอ Kiosk หรือกดเช็คอินผ่านหน้าระบบภายใน 15 นาทีหลังจากเริ่มเวลา หากไม่เช็คอิน ระบบจะยกเลิกการจองและปล่อยห้องว่างให้ผู้อื่นทันที
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs text-center transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
            </Link>
            
            <Link
              href="/check-in"
              className="flex-1 py-3 px-4 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white font-bold text-xs text-center shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" /> ไปหน้า Smart Check-In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}