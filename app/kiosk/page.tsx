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
  Radio
} from "lucide-react";

interface RoomItem {
  id: string;
  name: string;
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

  // 2. ดึงรายชื่อห้องทั้งหมด
  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setRooms(data);
        // ถ้าห้องที่เลือกไม่อยู่ในรายการ ให้ใช้ห้องแรกเป็นค่าเริ่มต้น
        if (!selectedRoomId) {
          setSelectedRoomId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  // 3. ดึงคิวการจองของห้องที่เลือก (คำนวณตามเวลาจริง)
  const fetchBookings = async () => {
    if (!selectedRoomId) return;

    try {
      // ตัดรอบการจองที่หมดอายุทันทีก่อนดึงข้อมูล
      await autoReleaseExpiredBookings();

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`;

      // ดึงการจองของห้องนี้ในวันนี้ ที่ยังไม่ถูกยกเลิก
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", selectedRoomId)
        .eq("date", todayStr)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (error) throw error;

      // กรองเฉพาะรายการที่ยังไม่หมดเวลาสิ้นสุด
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

  // ดึงห้องตอนเริ่มหน้าเว็บ
  useEffect(() => {
    fetchRooms();
  }, []);

  // เมื่อเลือกเปลี่ยนห้องใน Dropdown ให้ดึงคิวการจองใหม่ทันที
  useEffect(() => {
    if (selectedRoomId) {
      setIsLoading(true);
      fetchBookings();
    }
  }, [selectedRoomId]);

  // ตัวนับเวลานาฬิกาเดินทุกวินาที และโหลดข้อมูลอัตโนมัติทุก 10 วินาที
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

  // ฟังก์ชันแปลงสตริงเวลาให้เป็น Timestamp (ms)
  const getBookingTimestamp = (dateStr: string, timeVal: string): number => {
    if (!timeVal) return NaN;
    if (timeVal.includes("T")) return new Date(timeVal).getTime();
    const cleanTime = timeVal.length === 5 ? `${timeVal}:00` : timeVal.substring(0, 8);
    return new Date(`${dateStr}T${cleanTime}`).getTime();
  };

  // ฟังก์ชันจัดรูปแบบเวลาสำหรับแสดงผล (HH:mm)
  const formatDisplayTime = (timeVal: string) => {
    if (!timeVal) return "";
    if (timeVal.includes("T")) {
      const d = new Date(timeVal);
      return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return timeVal.substring(0, 5);
  };

  // ตรวจสอบหารายการจองที่กำลังเกิดขึ้น "ณ วินาทีนี้"
  const nowMs = currentTime.getTime();
  const currentBooking = bookings.find((b) => {
    if (b.status !== "pending" && b.status !== "checked_in") return false;
    const startMs = getBookingTimestamp(b.date, b.start_time);
    const endMs = getBookingTimestamp(b.date, b.end_time);

    if (isNaN(startMs) || isNaN(endMs)) return false;

    // เปิดให้เช็คอินล่วงหน้าได้ 15 นาทีก่อนเริ่ม จนกระทั่งถึงเวลาสิ้นสุด
    const checkInWindowStart = startMs - 15 * 60 * 1000;
    return nowMs >= checkInWindowStart && nowMs < endMs;
  });

  const currentRoom = rooms.find((r) => r.id === selectedRoomId);

  if (isAdminChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/20">
            F
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-slate-900 tracking-tight text-lg">FIBO Smart Signage</h1>
              <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                ADMIN KIOSK MODE
              </span>
            </div>
            <p className="text-xs text-slate-500">
              จอแสดงสถานะหน้าห้องและ Dynamic QR Code สำหรับสแกนเช็คอิน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>เลือกห้องแสดงผล:</span>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  ห้อง {room.name || room.id} ({room.id})
                </option>
              ))}
            </select>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            กลับหน้าหลัก
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xl max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: ข้อมูลห้อง สถานะ และรายการจอง */}
          <div className="md:col-span-7 space-y-6">
            <div>
              <span className="text-xs font-black text-orange-600 tracking-wider uppercase">
                FIBO SMART SPACE • FLOOR {currentRoom?.floor || 2}
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <h2 className="text-5xl font-black text-slate-900 tracking-tight">
                  {selectedRoomId}
                </h2>
                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                    เวลาปัจจุบัน (CURRENT TIME)
                  </span>
                  <span className="text-2xl font-black text-slate-900 tracking-wider">
                    {currentTime.toLocaleTimeString("th-TH", { hour12: false })}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                จุได้สูงสุด {currentRoom?.capacity || 40} คน
              </p>
            </div>

            {/* กล่องสถานะห้องปัจจุบัน */}
            {currentBooking && currentBooking.status === "pending" ? (
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-4.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-sm font-black text-amber-900 tracking-wide uppercase">
                    WAITING FOR CHECK-IN (รอยืนยันสิทธิ์)
                  </h3>
                </div>
                <p className="text-xs text-amber-800 font-medium">
                  ถึงคิวการใช้งานแล้ว: <span className="font-bold underline">{currentBooking.title}</span> (กรุณาสแกน QR Code เพื่อเริ่มใช้งาน)
                </p>
              </div>
            ) : currentBooking && currentBooking.status === "checked_in" ? (
              <div className="bg-blue-50/80 border-2 border-blue-300 rounded-2xl p-4.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <h3 className="text-sm font-black text-blue-900 tracking-wide uppercase">
                    OCCUPIED (ห้องกำลังถูกใช้งาน)
                  </h3>
                </div>
                <p className="text-xs text-blue-800 font-medium">
                  กำลังใช้งาน: <span className="font-bold">{currentBooking.title}</span>
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-4.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-black text-emerald-900 tracking-wide uppercase">
                    ROOM AVAILABLE (ห้องว่าง)
                  </h3>
                </div>
                <p className="text-xs text-emerald-700 font-medium">
                  ห้องว่างพร้อมใช้งาน สามารถทำรายการจองผ่านเว็บไซต์ระบบ FIBO Smart Space
                </p>
              </div>
            )}

            {/* ตารางคิวการจองวันนี้ */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  ตารางการจองวันนี้ ({bookings.length} รายการ)
                </h4>
                <span className="text-[10px] font-bold text-slate-400">
                  อัปเดตแบบอัตโนมัติ
                </span>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 font-medium">
                  ยังไม่มีรายการจองสำหรับห้องนี้ในวันนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 block">
                          {b.title}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatDisplayTime(b.start_time)} - {formatDisplayTime(b.end_time)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          b.status === "checked_in"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
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

          {/* Right Column: แสดง Dynamic QR Code หรือ ไอคอนสถานะห้องว่าง */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 text-center border-t md:border-t-0 md:border-l border-slate-100 min-h-[340px]">
            {currentBooking && currentBooking.status === "pending" ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="p-4 bg-white rounded-3xl border-2 border-orange-200 shadow-xl inline-block">
                  <QRCodeSVG 
                    value={selectedRoomId} 
                    size={210} 
                    level="H"
                  />
                </div>
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
                    <QrCode className="w-3.5 h-3.5" />
                    สแกนเพื่อเช็คอินเข้าห้อง
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    เปิดเมนู Check In บนมือถือของคุณ แล้วเปิดกล้องสแกน QR Code บนจอนี้เพื่อยืนยันสิทธิ์
                  </p>
                </div>
              </div>
            ) : currentBooking && currentBooking.status === "checked_in" ? (
              <div className="space-y-3">
                <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-10 h-10 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">ห้องกำลังถูกใช้งาน</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    การจองรอบนี้ได้รับการเช็คอินเรียบร้อยแล้ว และจะเช็คเอาท์อัตโนมัติเมื่อครบกำหนดเวลา
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">ห้องว่างพร้อมใช้งาน</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    เมื่อถึงเวลาที่มีคิวจอง ระบบจะแสดง QR Code ที่หน้าจอนี้โดยอัตโนมัติเพื่อให้ผู้จองสแกนเข้าใช้งาน
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold border border-emerald-200">
                    <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                    เชื่อมต่อฐานข้อมูล Realtime แล้ว
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