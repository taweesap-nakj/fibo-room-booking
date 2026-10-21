"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function KioskPage() {
  const router = useRouter();

  // State สำหรับตรวจสอบสิทธิ์ Admin
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // State สำหรับข้อมูลห้องและการจอง
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [origin, setOrigin] = useState<string>("");

  // 1. ตรวจสอบสิทธิ์ผู้ใช้ว่าใช่ Admin หรือไม่
  useEffect(() => {
    setOrigin(window.location.origin);

    const checkAdminAccess = async () => {
      setAuthLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }

      setUserEmail(session.user.email || null);

      // ดึงค่า role จากตาราง profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      // เช็คว่าเป็น admin ในตาราง profiles หรือใน user_metadata
      const userRole = profile?.role || session.user.user_metadata?.role;

      // เพิ่มเงื่อนไขให้เมล admin@fibo.kmutt.ac.th ผ่านได้ทันที
      if (userRole === "admin" || session.user.email === "admin@fibo.kmutt.ac.th") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    };

    checkAdminAccess();
  }, []);

  // 2. นาฬิกา Realtime
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. ดึงข้อมูลห้องและการจอง (ทำงานเฉพาะเมื่อเป็น Admin เท่านั้น)
  const fetchKioskData = async () => {
    const { data: roomsData } = await supabase
      .from("rooms")
      .select("*")
      .order("id", { ascending: true });

    if (roomsData && roomsData.length > 0) {
      setRooms(roomsData);
      if (!selectedRoomId) {
        setSelectedRoomId(roomsData[0].id);
      }
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("*")
      .eq("date", todayStr)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    if (bookingsData) {
      setBookings(bookingsData);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchKioskData();

    const channel = supabase
      .channel("kiosk-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchKioskData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => fetchKioskData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // ---------------- หน้าจอขณะกำลังตรวจสอบสิทธิ์ ----------------
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ (Admin)...</p>
      </div>
    );
  }

  // ---------------- หน้าจอบล็อกการเข้าถึง (ถ้าไม่ใช่ Admin) ----------------
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="inline-block px-3 py-1 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
            Admin Only Access
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ</h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            หน้าจอแสดงผล QR Code หน้าห้อง (Kiosk Signage) สงวนสิทธิ์การใช้งานเฉพาะเจ้าหน้าที่ดูแลระบบของ FIBO เท่านั้น
          </p>

          {userEmail ? (
            <div className="bg-slate-50 rounded-xl p-3 mb-6 border border-slate-200 text-xs text-slate-600">
              บัญชีปัจจุบัน: <span className="font-semibold text-slate-800">{userEmail}</span>
              <div className="text-red-500 font-medium mt-0.5">(สถานะ: ผู้ใช้งานทั่วไป ไม่ใช่ Admin)</div>
            </div>
          ) : (
            <div className="bg-amber-50 rounded-xl p-3 mb-6 border border-amber-200 text-xs text-amber-700">
              คุณยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบด้วยบัญชี Admin
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/"
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
            >
              กลับหน้าหลัก
            </Link>
            <Link
              href="/login"
              className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-orange-500/20 transition"
            >
              เข้าสู่ระบบ Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- คำนวณสถานะห้องปัจจุบัน (สำหรับ Admin) ----------------
  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];
  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const roomBookings = bookings.filter(
    (b) => b.room_id?.toUpperCase() === currentRoom?.id?.toUpperCase()
  );

  const activeBooking = roomBookings.find((b) => {
    const [sh, sm] = (b.start_time || "00:00").split(":").map(Number);
    const [eh, em] = (b.end_time || "00:00").split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return nowMinutes >= startMin - 15 && nowMinutes < endMin;
  });

  const isOccupied = activeBooking?.status === "checked_in";
  const isPendingCheckIn = activeBooking && activeBooking.status !== "checked_in";

  const checkInUrl = activeBooking
    ? `${origin}/check-in?bookingId=${activeBooking.id}&roomId=${currentRoom?.id}`
    : `${origin}/check-in?roomId=${currentRoom?.id}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    checkInUrl
  )}`;

  // ---------------- UI หน้า Kiosk ธีม FIBO Smart Space ----------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navbar สไตล์เดียวกับหน้าหลัก */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-orange-500/30">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-800 text-lg leading-none">
                  FIBO Smart Signage
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-orange-100 text-orange-600 rounded-full">
                  ADMIN KIOSK MODE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                จอแสดงสถานะหน้าห้องและ Dynamic QR Code สำหรับสแกนเช็คอินเข้าใช้งาน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">เลือกห้องแสดงผล:</span>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  ห้อง {room.id} ({room.name || `ชั้น ${room.floor || "-"}`})
                </option>
              ))}
            </select>

            <Link
              href="/"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <span>←</span> กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* แถบสีสถานะด้านบนการ์ด */}
          <div
            className={`h-3 w-full ${
              isOccupied
                ? "bg-red-500"
                : isPendingCheckIn
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
          />

          <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* ฝั่งซ้าย: ข้อมูลห้องและตารางเวลา (7 คอลัมน์) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-500 block mb-1">
                    FIBO SMART SPACE • FLOOR {currentRoom?.floor || "3"}
                  </span>
                  <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
                    {currentRoom?.id || "FIBO-301"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {currentRoom?.name || "ห้องประชุมและปฏิบัติการ"} • จุได้สูงสุด{" "}
                    {currentRoom?.capacity || 8} คน
                  </p>
                </div>

                <div className="text-right bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    เวลาปัจจุบัน (CURRENT TIME)
                  </span>
                  <span className="text-3xl font-mono font-bold text-slate-800">
                    {currentTime.toLocaleTimeString("th-TH", { hour12: false })}
                  </span>
                </div>
              </div>

              {/* กล่องสถานะใหญ่ */}
              <div
                className={`p-6 rounded-2xl border-2 ${
                  isOccupied
                    ? "bg-red-50/70 border-red-200 text-red-900"
                    : isPendingCheckIn
                    ? "bg-amber-50/70 border-amber-200 text-amber-900"
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full animate-pulse ${
                      isOccupied
                        ? "bg-red-500"
                        : isPendingCheckIn
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />
                  <h3 className="text-2xl md:text-3xl font-extrabold">
                    {isOccupied
                      ? "IN USE (กำลังใช้งาน)"
                      : isPendingCheckIn
                      ? "WAITING FOR CHECK-IN (รอสแกนเช็คอิน)"
                      : "ROOM AVAILABLE (ห้องว่าง)"}
                  </h3>
                </div>

                {activeBooking ? (
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="font-semibold">
                      ผู้จอง: {activeBooking.user_name || activeBooking.user_email || "นักศึกษา/บุคลากร"}
                    </p>
                    <p>
                      ช่วงเวลา: <span className="font-mono font-bold">{activeBooking.start_time} - {activeBooking.end_time} น.</span>
                    </p>
                    {activeBooking.purpose && <p>หัวข้อ: {activeBooking.purpose}</p>}
                  </div>
                ) : (
                  <p className="text-sm opacity-80">
                    ห้องว่างพร้อมใช้งาน สามารถทำรายการจองผ่านเว็บไซต์ระบบ FIBO Smart Space
                  </p>
                )}
              </div>

              {/* รายการจองของห้องนี้ในวันนี้ */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  ตารางการจองวันนี้ ({roomBookings.length} รายการ)
                </h4>
                {roomBookings.length === 0 ? (
                  <div className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                    ยังไม่มีรายการจองสำหรับห้องนี้ในวันนี้
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {roomBookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-800 mr-3">
                            {b.start_time} - {b.end_time}
                          </span>
                          <span className="text-slate-600">
                            {b.user_name || b.purpose || "มีการจองใช้งาน"}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            b.status === "checked_in"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
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

            {/* ฝั่งขวา: กล่อง QR Code สำหรับสแกนเช็คอิน (5 คอลัมน์) */}
            <div className="lg:col-span-5">
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col items-center text-center">
                {activeBooking ? (
                  <>
                    <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full mb-3">
                      SCAN TO CHECK-IN
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">
                      สแกน QR Code เพื่อยืนยันเข้าใช้ห้อง
                    </h3>
                    <p className="text-xs text-slate-500 mb-5">
                      กรุณาสแกนภายในเวลาที่กำหนดเพื่อรักษาสิทธิ์การจองห้อง {currentRoom?.id}
                    </p>

                    <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 mb-4">
                      <img
                        src={qrImageUrl}
                        alt="Check-in QR Code"
                        className="w-56 h-56 object-contain"
                      />
                    </div>

                    <p className="text-xs text-slate-400">
                      รหัสการจอง: <span className="font-mono">{activeBooking.id?.slice(0, 8)}</span>
                    </p>
                  </>
                ) : (
                  <div className="py-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      ห้องว่างพร้อมใช้งาน
                    </h3>
                    <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">
                      เมื่อถึงเวลาที่มีคิวจอง ระบบจะแสดง QR Code ที่หน้าจอนี้โดยอัตโนมัติเพื่อให้ผู้จองสแกนเข้าใช้งาน
                    </p>
                    <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-3.5 py-2 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      เชื่อมต่อฐานข้อมูล Realtime แล้ว
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}