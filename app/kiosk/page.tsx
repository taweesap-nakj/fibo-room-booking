"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { autoReleaseExpiredBookings } from "@/lib/booking";
import { QRCodeSVG } from "qrcode.react";
import { 
  Clock, 
  CheckCircle2, 
  ArrowLeft, 
  Users, 
  QrCode,
  Radio,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  ScanLine
} from "lucide-react";

interface RoomItem {
  id: string;
  name?: string;
  capacity?: number;
  floor?: number;
  status?: string;
}

interface BookingItem {
  id: string;
  room_id: string;
  title: string;
  user_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "checked_in" | "completed" | "cancelled";
}

export default function KioskPage() {
  const router = useRouter();
  const [isAdminChecking, setIsAdminChecking] = useState<boolean>(true);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("FB201");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. ตรวจสอบสิทธิ์ Admin
  useEffect(() => {
    const verifyAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      setIsAdminChecking(false);
    };
    verifyAdmin();
  }, [router]);

  // 2. ดึงรายชื่อห้องทั้งหมด (กรองห้อง SB- และ FIBO- ชุดเก่าออก)
  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const cleanRooms = data.filter(
          (r: any) =>
            !String(r.id).startsWith("SB-") &&
            !String(r.id).startsWith("FIBO-")
        );
        setRooms(cleanRooms);
        if (!selectedRoomId && cleanRooms.length > 0) {
          setSelectedRoomId(cleanRooms[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  // 3. ดึงคิวการจองของห้องที่เลือก
  const fetchBookings = async () => {
    if (!selectedRoomId) return;

    try {
      await autoReleaseExpiredBookings();

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`;

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", selectedRoomId)
        .eq("date", todayStr)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (error) throw error;

      const nowMs = Date.now();
      const validBookings = (data || []).filter((b: any) => {
        let endMs = new Date(b.end_time).getTime();
        if (isNaN(endMs) && b.date && b.end_time) {
          const cleanTime = b.end_time.length === 5 ? `${b.end_time}:00` : b.end_time.substring(0, 8);
          endMs = new Date(`${b.date}T${cleanTime}`).getTime();
        }
        return isNaN(endMs) ? true : endMs > nowMs;
      });

      setBookings(validBookings as BookingItem[]);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      setIsLoading(true);
      fetchBookings();
    }
  }, [selectedRoomId]);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const autoSyncTimer = setInterval(() => {
      if (selectedRoomId) {
        fetchBookings();
      }
    }, 10000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(autoSyncTimer);
    };
  }, [selectedRoomId]);

  const getBookingTimestamp = (dateStr: string, timeVal: string): number => {
    if (!timeVal) return NaN;
    if (timeVal.includes("T")) return new Date(timeVal).getTime();
    const cleanTime = timeVal.length === 5 ? `${timeVal}:00` : timeVal.substring(0, 8);
    return new Date(`${dateStr}T${cleanTime}`).getTime();
  };

  const formatDisplayTime = (timeVal: string) => {
    if (!timeVal) return "";
    if (timeVal.includes("T")) {
      const d = new Date(timeVal);
      return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return timeVal.substring(0, 5);
  };

  const nowMs = currentTime.getTime();
  const currentBooking = bookings.find((b) => {
    if (b.status !== "pending" && b.status !== "checked_in") return false;
    const startMs = getBookingTimestamp(b.date, b.start_time);
    const endMs = getBookingTimestamp(b.date, b.end_time);

    if (isNaN(startMs) || isNaN(endMs)) return false;

    return nowMs >= startMs && nowMs < endMs;
  });

  const currentRoom = rooms.find((r) => r.id === selectedRoomId);

  if (isAdminChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs font-mono text-orange-400">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl">
          <Cpu className="w-5 h-5 text-orange-500 animate-spin" />
          <span>INITIALIZING FIBO KIOSK HUD...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* Dynamic Cyber Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] bg-orange-500/10 rounded-full blur-[120px] animate-pulse" />
        <div 
          className="absolute bottom-0 -right-32 w-[36rem] h-[36rem] bg-sky-500/10 rounded-full blur-[140px]" 
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
      </div>

      {/* Top Header Bar: Sci-Fi Glass */}
      <header className="bg-slate-900/60 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-lg shadow-orange-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-white tracking-tight text-lg">FIBO Smart Signage</h1>
              <span className="text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                KIOSK HUD ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              หน้าจอบริหารสถานะห้องแล็บ และ Dynamic QR Code สำหรับสแกนเข้าห้อง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-2xl shadow-inner">
            <span className="text-slate-400 text-[11px]">เลือกห้อง:</span>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-transparent border-none text-xs font-black text-orange-400 focus:outline-none cursor-pointer"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id} className="bg-slate-900 text-slate-200">
                  ห้อง {room.id} {room.name ? `(${room.name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-orange-400" />
            กลับหน้าหลัก
          </Link>
        </div>
      </header>

      {/* Main Container HUD Glass Card */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-10 relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-3xl rounded-3xl p-8 border border-white/15 shadow-[0_20px_70px_rgba(0,0,0,0.6)] max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative overflow-hidden">
          
          {/* Subtle Cyber Sheen across container */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent pointer-events-none rounded-bl-full" />

          {/* Left Column: Room info & Status */}
          <div className="md:col-span-7 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-orange-400 tracking-wider uppercase font-mono bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-md">
                  FIBO LAB NODE • FLOOR {currentRoom?.floor || 2}
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-2">
                <h2 className="text-6xl font-black text-white tracking-tight drop-shadow-md">
                  {selectedRoomId}
                </h2>
                <div className="bg-slate-950/70 border border-white/10 px-4 py-2 rounded-2xl text-right backdrop-blur-md shadow-inner">
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider font-mono">
                    REALTIME 24H
                  </span>
                  <span className="text-2xl font-black text-white font-mono tracking-wider">
                    {currentTime.toLocaleTimeString("th-TH", { hour12: false })}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-semibold mt-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                รองรับสูงสุด {currentRoom?.capacity || 40} คน • {currentRoom?.status || "Active Lab"}
              </p>
            </div>

            {/* Status Aura Reactor Card */}
            {currentBooking && currentBooking.status === "pending" ? (
              <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-2 border-amber-500/40 rounded-2xl p-5 space-y-1.5 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <h3 className="text-sm font-black text-amber-300 tracking-wider uppercase font-mono">
                    WAITING FOR CHECK-IN (ถึงคิวการจองแล้ว)
                  </h3>
                </div>
                <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
                  หัวข้อ: <span className="font-black text-white underline">{currentBooking.title}</span> (กรุณาสแกน QR Code หน้าจอเพื่อเริ่มใช้งานห้อง)
                </p>
              </div>
            ) : currentBooking && currentBooking.status === "checked_in" ? (
              <div className="bg-gradient-to-r from-sky-500/15 to-blue-500/15 border-2 border-sky-500/40 rounded-2xl p-5 space-y-1.5 shadow-[0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <h3 className="text-sm font-black text-sky-300 tracking-wider uppercase font-mono">
                    OCCUPIED (ห้องกำลังถูกใช้งาน)
                  </h3>
                </div>
                <p className="text-xs text-sky-200/90 font-medium">
                  กำลังใช้งาน: <span className="font-black text-white">{currentBooking.title}</span>
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-2 border-emerald-500/40 rounded-2xl p-5 space-y-1.5 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                  <h3 className="text-sm font-black text-emerald-300 tracking-wider uppercase font-mono">
                    ROOM AVAILABLE (ห้องว่างพร้อมใช้งาน)
                  </h3>
                </div>
                <p className="text-xs text-emerald-200/90 font-medium">
                  ห้องว่างพร้อมใช้งาน สามารถจองผ่านเว็บไซต์ FIBO Smart Space เพื่อเปิดสิทธิ์ใช้งานทันที
                </p>
              </div>
            )}

            {/* Glass Schedule Queue List */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-400" /> ตารางการจองวันนี้ ({bookings.length} รายการ)
                </h4>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  AUTO-SYNC 10S
                </span>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-slate-950/40 border border-dashed border-white/10 rounded-2xl p-6 text-center text-xs text-slate-500 font-medium">
                  ยังไม่มีรายการจองสำหรับห้องนี้ในวันนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 flex items-center justify-between text-xs transition-all backdrop-blur-md"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">
                          {b.title}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDisplayTime(b.start_time)} - {formatDisplayTime(b.end_time)} น.
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          b.status === "checked_in"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {b.status === "checked_in" ? "เช็คอินแล้ว" : "รอเช็คอิน"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Holographic QR Target Frame */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 text-center border-t md:border-t-0 md:border-l border-white/10 min-h-[360px] relative">
            {currentBooking && currentBooking.status === "pending" ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                {/* Tech Bracket QR Frame */}
                <div className="relative p-5 bg-white rounded-3xl shadow-[0_0_50px_rgba(249,115,22,0.35)] inline-block">
                  {/* Futuristic Corner Sensor Markers */}
                  <div className="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-orange-500" />
                  <div className="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-orange-500" />
                  <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-orange-500" />
                  <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-orange-500" />

                  <QRCodeSVG 
                    value={selectedRoomId} 
                    size={210} 
                    level="H"
                  />
                </div>

                <div className="space-y-1.5 max-w-xs mx-auto">
                  <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 px-3.5 py-1 rounded-full text-xs font-black border border-orange-500/30">
                    <ScanLine className="w-3.5 h-3.5 animate-pulse" />
                    SCAN QR TO CHECK-IN
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    เปิดเมนู Check In บนมือถือของคุณ แล้วสแกนเพื่อยืนยันสิทธิ์เข้าใช้งานห้อง
                  </p>
                </div>
              </div>
            ) : currentBooking && currentBooking.status === "checked_in" ? (
              <div className="space-y-4 text-center">
                <div className="w-24 h-24 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(56,189,248,0.2)]">
                  <Clock className="w-12 h-12 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white">ห้องกำลังถูกใช้งาน</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    คิวการจองนี้เช็คอินเรียบร้อยแล้ว ระบบจะ Check-Out อัตโนมัติเมื่อครบกำหนดเวลา
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white">ห้องว่างพร้อมใช้งาน</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    เมื่อถึงเวลาที่มีคิวจอง ระบบจะแสดง QR Code บนหน้านี้โดยอัตโนมัติเพื่อให้ผู้จองสแกนเข้าห้อง
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-[11px] font-bold border border-emerald-500/30">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    LIVE SENSOR SYNCED
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}