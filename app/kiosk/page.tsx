"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Room, Booking } from "../data";
import Link from "next/link";
import { ArrowLeft, Users, Wifi, ShieldAlert, Clock, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function KioskPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [kioskRoomId, setKioskRoomId] = useState("FB305");
  const [currentTime, setCurrentTime] = useState("");
  const [remainingSecs, setRemainingSecs] = useState<number>(0);
  const [siteUrl, setSiteUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteUrl(window.location.origin);
    }
  }, []);

  const fetchData = async () => {
    try {
      const { data: roomsData } = await supabase.from("rooms").select("*").order("id");
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (roomsData) {
        setRooms(
          roomsData.map((r: any) => ({
            id: r.id,
            floor: r.floor,
            capacity: r.capacity,
            type: r.type,
            status: r.status,
            nextAvailable: r.next_available,
            description: r.description,
            amenities: r.amenities || [],
          }))
        );
      }

      if (bookingsData) {
        setBookings(
          bookingsData.map((b: any) => ({
            id: b.id,
            room: b.room_id,
            floor: 0,
            title: b.title,
            date: b.date,
            startTime: b.start_time,
            endTime: b.end_time,
            durationHours: Number(b.duration_hours),
            people: b.people,
            bookedBy: b.booked_by,
            email: b.email,
            amenities: [],
            status: b.status,
            checkedInAt: b.checked_in_at,
            expiresAt: b.expires_at,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kiosk-realtime-sub")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchData())
      .subscribe();

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      );
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(clockTimer);
    };
  }, []);

  const currentRoom = rooms.find((r) => r.id === kioskRoomId) || rooms[0] || {
    id: kioskRoomId,
    floor: 3,
    capacity: 10,
    type: "Meeting Room",
    status: "available",
    nextAvailable: "Now",
    description: "",
    amenities: [],
  };

  const currentBooking = bookings.find(
    (b) => b.room === currentRoom.id && (b.status === "pending" || b.status === "checked_in")
  );

  // ระบบตรวจจับเวลานับถอยหลัง 15 นาที และตัดสิทธิ์อัตโนมัติบนจอ Kiosk ทันที
  useEffect(() => {
    if (currentBooking && currentBooking.status === "pending" && currentBooking.expiresAt) {
      const interval = setInterval(async () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((currentBooking.expiresAt! - now) / 1000));
        setRemainingSecs(diff);

        if (diff <= 0) {
          // หมดเวลา 15 นาที ทำการ Release ห้องคืนระบบทันที
          clearInterval(interval);
          await supabase.from("bookings").update({ status: "cancelled" }).eq("id", currentBooking.id);
          await supabase.from("rooms").update({ status: "available", next_available: "Now" }).eq("id", currentRoom.id);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setRemainingSecs(0);
    }
  }, [currentBooking, currentRoom.id]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // URL ที่ฝังใน QR Code สำหรับให้มือถือสแกนแล้วเปิดหน้ายืนยันเช็คอิน
  const checkInUrl = `${siteUrl}/check-in?booking_id=${currentBooking?.id || ""}&room=${currentRoom.id}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1550px] w-full mx-auto select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <h3 className="text-sm font-black text-slate-900">Wall-mounted Digital Room Signage (Live Cloud Display)</h3>
          <p className="text-[11px] text-slate-500">
            * จอติดผนังหน้าห้องเชื่อมต่อ Cloud Realtime พร้อม Dynamic QR Code สแกนได้จริง
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600">สลับจอห้อง:</span>
          <select
            value={kioskRoomId}
            onChange={(e) => setKioskRoomId(e.target.value)}
            className="border border-slate-300 bg-slate-50 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                ห้อง {r.id} (ชั้น {r.floor}) — [{r.status.toUpperCase()}]
              </option>
            ))}
          </select>
          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> ออก
          </Link>
        </div>
      </div>

      <div className="bg-[#090D16] rounded-[36px] p-6 sm:p-8 shadow-2xl border-[8px] border-slate-800 text-white">
        <div
          className={`h-3 w-full rounded-full mb-6 ${
            currentRoom.status === "available"
              ? "bg-emerald-500 shadow-xl shadow-emerald-500/60"
              : currentRoom.status === "pending"
              ? "bg-amber-400 shadow-xl shadow-amber-400/60 animate-pulse"
              : currentRoom.status === "in_use"
              ? "bg-rose-600 shadow-xl shadow-rose-600/60"
              : "bg-slate-600"
          }`}
        ></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-orange-400 block">
                  FIBO SMART SIGNAGE • FLOOR {currentRoom.floor}
                </span>
                <h2 className="text-6xl font-black mt-1">{currentRoom.id}</h2>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">Current Time</span>
                <span className="text-3xl font-black font-mono tracking-tight">{currentTime || "--:--:--"}</span>
              </div>
            </div>

            <div
              className={`p-6 rounded-3xl border-2 ${
                currentRoom.status === "available"
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300"
                  : currentRoom.status === "pending"
                  ? "bg-amber-500/10 border-amber-400/50 text-amber-300"
                  : currentRoom.status === "in_use"
                  ? "bg-rose-500/10 border-rose-500/50 text-rose-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <div className="text-3xl font-black tracking-wide">
                {currentRoom.status === "available" && "ROOM AVAILABLE (ห้องว่าง)"}
                {currentRoom.status === "pending" && "RESERVED (รอการเช็คอินที่หน้าห้อง)"}
                {currentRoom.status === "in_use" && "IN USE / OCCUPIED (กำลังใช้งาน)"}
                {currentRoom.status === "unavailable" && "OUT OF SERVICE (ปิดปรับปรุง)"}
              </div>
              <p className="text-sm text-slate-200 mt-2 font-medium">
                {currentBooking
                  ? `รายการ: ${currentBooking.title} • โดย: ${currentBooking.bookedBy} (${currentBooking.startTime} - ${currentBooking.endTime})`
                  : currentRoom.description || "ห้องว่างพร้อมใช้งาน"}
              </p>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-400 pt-2 border-t border-white/10">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-orange-400" /> จุได้ {currentRoom.capacity} คน</span>
              <span>•</span>
              <span>{currentRoom.type}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400"><Wifi className="w-3.5 h-3.5" /> Supabase Realtime Connected</span>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4">
            {currentRoom.status === "pending" && currentBooking ? (
              <>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black text-amber-400 tracking-widest">
                    Presence Verification
                  </span>
                  <h4 className="text-lg font-black text-white">สแกน QR เพื่อยืนยันว่าถึงหน้าห้อง</h4>
                  <p className="text-xs text-slate-300">
                    ใช้กล้องมือถือสแกนเพื่อเข้าเช็คอินภายในเวลาที่กำหนด
                  </p>
                </div>

                {/* QR Code สร้างขึ้นสดๆ จาก URL พร้อมไอคอนตึก */}
                <div className="bg-white p-4 rounded-3xl shadow-2xl ring-4 ring-orange-500/40">
                  <QRCodeSVG
                    value={checkInUrl}
                    size={190}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* ตัวจับเวลานับถอยหลัง 15 นาที */}
                <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <Clock className="w-4 h-4 animate-spin text-rose-400" />
                  <span>เหลือเวลาเช็คอิน: <strong className="font-mono text-white text-sm">{formatCountdown(remainingSecs)}</strong></span>
                </div>

                <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>หากไม่สแกนภายใน 15 นาที ระบบจะตัดสิทธิ์อัตโนมัติ</span>
                </div>
              </>
            ) : currentRoom.status === "in_use" ? (
              <div className="py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center mx-auto text-rose-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-white">ห้องกำลังถูกใช้งาน</h4>
                <p className="text-xs text-slate-400">
                  สิ้นสุดเวลา: <strong className="text-white">{currentBooking?.endTime || "12:00"}</strong>
                </p>
                <div className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                  เช็คอินแล้วเมื่อ {currentBooking?.checkedInAt || "เรียบร้อย"}
                </div>
              </div>
            ) : (
              <div className="py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
                  <Wifi className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-white">ห้องว่างพร้อมใช้งาน</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  จองผ่านหน้าเว็บไซต์ระบบ FIBO Smart Space เพื่อรับสิทธิ์ใช้งาน
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}