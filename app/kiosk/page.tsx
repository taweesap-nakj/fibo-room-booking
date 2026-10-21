"use client";

import { autoReleaseExpiredBookings } from "@/lib/booking";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Clock,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Users,
  Radio,
  DoorOpen,
} from "lucide-react";

interface BookingItem {
  id: string;
  room_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  attendees: number;
}

interface RoomItem {
  id: string;
  name?: string;
  floor: number;
  capacity: number;
  status: string;
}

export default function KioskPage() {
  const router = useRouter();
const [isAdminChecking, setIsAdminChecking] = useState(true);

useEffect(() => {
  const verifyAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    const isUserAdmin =
      session.user.email === "admin@fibo.kmutt.ac.th" ||
      profile?.role === "admin" ||
      session.user.user_metadata?.role === "admin";

    if (!isUserAdmin) {
      alert("หน้าจอ Kiosk สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น");
      router.replace("/");
      return;
    }
    setIsAdminChecking(false);
  };
  verifyAdmin();
}, [router]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("FB202");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ดึงรายชื่อห้องทั้งหมด
  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("*").order("id");
    if (data && data.length > 0) {
      setRooms(data);
      if (!selectedRoomId) {
        setSelectedRoomId(data[0].id);
      }
    }
  };

const fetchBookings = async () => {
    try {
      // 1. ตรวจสอบและตัดรายการหมดอายุทิ้งทันที
      await autoReleaseExpiredBookings();

      if (!selectedRoomId) return;

      const todayStr = new Date().toISOString().split("T")[0];

      // 2. ดึงการจองของห้องนี้ โดยไม่เอารายการที่ถูกยกเลิก (cancelled)
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", selectedRoomId)
        .eq("date", todayStr)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (error) throw error;

      // กรองเฉพาะรายการที่ยังไม่หมดเวลา
      const nowMs = Date.now();
      const validBookings = (bookingsData || []).filter((b: any) => {
        let endMs = new Date(b.end_time).getTime();
        if (isNaN(endMs) && b.date && b.end_time) {
          endMs = new Date(`${b.date}T${b.end_time}:00`).getTime();
        }
        return isNaN(endMs) ? true : endMs > nowMs;
      });

      setBookings(validBookings);
    } catch (err) {
      console.error("Kiosk fetch error:", err);
    }
  };

  useEffect(() => {
    fetchRooms();

    // ตัวจับเวลานาฬิกาเดินทุกวินาที
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // ดักฟัง Realtime จาก Supabase เมื่อมีการกดจองหรืออัปเดตสถานะ
    const channel = supabase
      .channel("kiosk-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchBookings()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => fetchRooms()
      )
      .subscribe();

    // สำรองดึงข้อมูลซ้ำทุก 10 วินาที
    const pollInterval = setInterval(() => {
      fetchBookings()
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // กรองรายการจองของห้องที่เลือก (เปรียบเทียบรหัสห้องแบบ Case-insensitive)
  const roomBookings = bookings.filter((b) => {
    const bRoom = (b.room_id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const sRoom = (selectedRoomId || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return bRoom === sRoom;
  });

  // ค้นหารายการจองที่ต้องแสดงผล ณ ตอนนี้
  // เงื่อนไข: เวลาปัจจุบันอยู่ในช่วง (เวลาเริ่ม - 15 นาที) ถึง (เวลาสิ้นสุด)
  const now = currentTime.getTime();

  const activeBooking = roomBookings.find((b) => {
    if (b.status === "completed" || b.status === "cancelled") return false;

    // รองรับทั้งแบบ ISO Date ("2026-10-21T23:50:00") และ Time string ("23:50")
    let startMs = new Date(b.start_time).getTime();
    let endMs = new Date(b.end_time).getTime();

    if (isNaN(startMs)) {
      const todayStr = currentTime.toISOString().split("T")[0];
      startMs = new Date(`${todayStr}T${b.start_time}:00`).getTime();
      endMs = new Date(`${todayStr}T${b.end_time}:00`).getTime();
    }

    // เปิดให้เช็คอินได้ล่วงหน้า 15 นาที จนถึงเวลาหมดการจอง
    const checkInStartWindow = startMs - 15 * 60 * 1000;
    return now >= checkInStartWindow && now <= endMs;
  });

  // สถานะห้อง ณ ปัจจุบัน
  const isPendingCheckIn = activeBooking && activeBooking.status !== "checked_in";
  const isOccupied = activeBooking && activeBooking.status === "checked_in";

  // ข้อมูลสำหรับสร้าง QR Code (สอดคล้องกับตัวสแกนในหน้า /check-in)
  const qrData = `FIBO-ROOM-${selectedRoomId}-${activeBooking?.id || "DIRECT"}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    qrData
  )}&margin=10`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-500/20">
            F
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-slate-800">FIBO Smart Signage</h1>
              <span className="bg-orange-100 text-[#EA580C] text-[10px] font-bold px-2 py-0.5 rounded-md">
                ADMIN KIOSK MODE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              จอแสดงสถานะหน้าห้องและ Dynamic QR Code สำหรับสแกนเช็คอิน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">เลือกห้องแสดงผล:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  ห้อง {r.id} {r.name ? `(${r.name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก
          </Link>
        </div>
      </header>

      {/* Main Kiosk Display */}
      <main className="flex-1 p-6 md:p-10 flex items-center justify-center">
        <div className="max-w-5xl w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* ข้อมูลห้องด้านซ้าย (7 Columns) */}
          <div className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-between space-y-6 border-b lg:border-b-0 lg:border-r border-slate-100">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-black tracking-wider uppercase text-orange-600">
                    FIBO SMART SPACE • FLOOR {selectedRoom?.floor || 2}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mt-1">
                    {selectedRoomId}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    จุได้สูงสุด {selectedRoom?.capacity || 40} คน
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    เวลาปัจจุบัน (CURRENT TIME)
                  </span>
                  <span className="text-2xl font-black text-slate-800 font-mono">
                    {currentTime.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
              </div>

              {/* ป้ายแสดงสถานะห้อง */}
              <div className="mt-8">
                {isOccupied ? (
                  <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 text-rose-800 flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping"></div>
                    <div>
                      <p className="font-black text-lg">OCCUPIED (กำลังใช้งานห้อง)</p>
                      <p className="text-xs text-rose-600 font-medium mt-0.5">
                        {activeBooking.title}
                      </p>
                    </div>
                  </div>
                ) : isPendingCheckIn ? (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-amber-900 flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full bg-amber-500 animate-ping"></div>
                    <div>
                      <p className="font-black text-lg">WAITING FOR CHECK-IN (รอยืนยันสิทธิ์)</p>
                      <p className="text-xs text-amber-700 font-medium mt-0.5">
                        ถึงคิวการใช้งานแล้ว: {activeBooking.title} (กรุณาสแกน QR Code เพื่อเริ่มใช้งาน)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-800 flex items-center gap-3.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
                    <div>
                      <p className="font-black text-base">ROOM AVAILABLE (ห้องว่าง)</p>
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">
                        ห้องว่างพร้อมใช้งาน สามารถทำรายการจองผ่านเว็บไซต์ระบบ FIBO Smart Space
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ตารางการจองของห้องนี้ */}
            <div className="pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
                <span>ตารางการจองวันนี้ ({roomBookings.length} รายการ)</span>
                <span className="text-[10px] text-slate-400">อัปเดตแบบอัตโนมัติ</span>
              </h4>

              {roomBookings.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-400 font-medium">
                  ยังไม่มีรายการจองสำหรับห้องนี้ในวันนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {roomBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{b.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {b.start_time.includes("T")
                            ? new Date(b.start_time).toLocaleTimeString("th-TH", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : b.start_time}{" "}
                          -{" "}
                          {b.end_time.includes("T")
                            ? new Date(b.end_time).toLocaleTimeString("th-TH", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : b.end_time}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          b.status === "checked_in"
                            ? "bg-emerald-100 text-emerald-700"
                            : b.status === "completed"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {b.status === "checked_in"
                          ? "ใช้งานอยู่"
                          : b.status === "completed"
                          ? "เสร็จสิ้น"
                          : "รอเช็คอิน"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ฝั่งขวา: กล่องแสดง QR Code หรือ สถานะห้องว่าง (5 Columns) */}
          <div className="lg:col-span-5 p-8 md:p-10 bg-slate-50/60 flex flex-col items-center justify-center text-center space-y-4">
            {isPendingCheckIn ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-white p-4 rounded-3xl shadow-xl border border-orange-200 inline-block">
                  <img
                    src={qrCodeUrl}
                    alt="Check-in QR Code"
                    className="w-56 h-56 rounded-xl mx-auto"
                  />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-orange-100 text-[#EA580C] px-3 py-1 rounded-full text-xs font-black">
                    <QrCode className="w-3.5 h-3.5" /> สแกนเพื่อเช็คอินเข้าห้อง
                  </span>
                  <p className="text-xs text-slate-500 mt-2 max-w-xs">
                    เปิดเมนู <strong>Check In</strong> บนมือถือของคุณ แล้วเปิดกล้องสแกน QR Code
                    บนจอนี้เพื่อยืนยันสิทธิ์
                  </p>
                </div>
              </div>
            ) : isOccupied ? (
              <div className="space-y-3">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                  <DoorOpen className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-800">ห้องกำลังถูกใช้งาน</h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  ผู้จองได้ทำการเช็คอินยืนยันตัวตนเรียบร้อยแล้ว หากต้องการใช้งานห้องนี้
                  สามารถจองในรอบเวลาถัดไป
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">ห้องว่างพร้อมใช้งาน</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  เมื่อถึงเวลาที่มีคิวจอง ระบบจะแสดง QR Code
                  ที่หน้าจอนี้โดยอัตโนมัติเพื่อให้ผู้จองสแกนเข้าใช้งาน
                </p>
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1.5 rounded-full text-[11px] font-bold">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                  เชื่อมต่อฐานข้อมูล Realtime แล้ว
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}