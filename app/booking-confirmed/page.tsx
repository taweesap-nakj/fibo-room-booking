"use client";

import { useState, useEffect } from "react";
import { INITIAL_BOOKINGS, Booking } from "../data";
import Link from "next/link";
import { CheckCircle2, Copy, Check, Tablet, KeyRound, ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";

export default function BookingConfirmedPage() {
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sb_bookings");
    if (saved) {
      const list: Booking[] = JSON.parse(saved);
      if (list.length > 0) {
        setLatestBooking(list[0]);
      }
    } else if (INITIAL_BOOKINGS.length > 0) {
      setLatestBooking(INITIAL_BOOKINGS[0]);
    }
  }, []);

  const getRoomPin = (roomId?: string) => {
    if (!roomId) return "8888";
    const num = roomId.replace(/\D/g, "") || "202";
    return `${num}4`.slice(0, 4).padStart(4, "8");
  };

  const handleCopy = () => {
    if (!latestBooking) return;
    navigator.clipboard.writeText(latestBooking.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!latestBooking) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-slate-500">ไม่พบข้อมูลการจองล่าสุด</p>
        <Link href="/" className="inline-block px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold">
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const roomPin = getRoomPin(latestBooking.room);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl w-full mx-auto space-y-6">
      {/* Banner สถานะสำเร็จ */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 flex items-center gap-4 text-emerald-800">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">จองห้องสำเร็จเรียบร้อย!</h2>
          <p className="text-xs sm:text-sm text-emerald-700 font-medium">
            ระบบได้บันทึกการจองและล็อกช่วงเวลาสำหรับห้อง {latestBooking.room} เรียบร้อยแล้ว
          </p>
        </div>
      </div>

      {/* บัตร Digital Pass */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#111827] via-[#1F2937] to-[#EA580C] px-6 py-4 text-white flex justify-between items-center">
          <span className="text-xs font-extrabold uppercase tracking-widest text-orange-300">
            FIBO Official Booking Pass
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-white/15 px-3 py-1 rounded-full">
              #{latestBooking.id}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="คัดลอก Booking ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">ห้องที่จอง</span>
              <h3 className="text-4xl font-black text-slate-900 mt-0.5">{latestBooking.room}</h3>
              <p className="text-sm font-semibold text-slate-600 mt-1">{latestBooking.title}</p>
            </div>

            <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-4 text-center sm:text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                รหัส PIN หน้าห้อง
              </span>
              <span className="text-3xl font-black font-mono tracking-widest text-[#EA580C]">
                {roomPin}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Calendar className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block font-medium">วันที่</span>
                <span className="font-bold text-slate-800">{latestBooking.date}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block font-medium">ช่วงเวลา</span>
                <span className="font-bold text-slate-800">
                  {latestBooking.startTime} – {latestBooking.endTime} ({latestBooking.durationHours} ชม.)
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block font-medium">ตำแหน่ง</span>
                <span className="font-bold text-slate-800">ชั้น {latestBooking.floor} ตึก FIBO</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
            <p className="font-bold">⚠️ เงื่อนไขการเข้าใช้งาน (15-Minute Auto-Release):</p>
            <p className="text-[11px] text-amber-800">
              กรุณากดเช็คอินผ่าน One-Tap Pass หรือกรอกรหัส PIN บนแท็บเล็ตหน้าห้องภายใน 15 นาทีหลังจากเริ่มเวลา หากไม่เช็คอิน ระบบจะยกเลิกการจองและปล่อยห้องว่างให้ผู้อื่นทันที
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
            </Link>

            <div className="flex gap-2 w-full sm:w-auto">
              <Link
                href={`/kiosk?room=${latestBooking.room}`}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-orange-100 transition-all"
              >
                <Tablet className="w-4 h-4" /> ดูจอหน้าห้อง (Kiosk)
              </Link>
              <Link
                href="/check-in"
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 transition-all"
              >
                <KeyRound className="w-4 h-4" /> ไปหน้า Smart Check-In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}