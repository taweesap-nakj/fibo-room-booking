"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  QrCode,
  MapPin,
  AlertTriangle,
  Camera,
  X,
  ArrowLeft,
  Calendar,
  Users,
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface BookingItem {
  id: string;
  room: string;
  floor: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  people: number;
  bookedBy: string;
  status: string;
  checkedInAt: string | null;
  expiresAt: string | null;
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get("booking_id");
  const urlRoomId = searchParams.get("room");

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [remainingSecs, setRemainingSecs] = useState<number>(900);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [activeScanBookingId, setActiveScanBookingId] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // ดึงข้อมูลการจองจาก Supabase
  const fetchData = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select("*")
        .order("start_time", { ascending: false });

      if (error) {
        console.error("Fetch bookings error:", error);
        return;
      }

      if (bookingsData) {
        setBookings(
          bookingsData.map((b: any) => {
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);
            const duration = Math.max(
              0,
              (end.getTime() - start.getTime()) / (1000 * 60 * 60)
            );

            return {
              id: b.id,
              room: b.room_id || "-",
              floor: Number(String(b.room_id).replace(/\D/g, "")[0]) || 3,
              title: b.title || "การประชุม",
              date: b.start_time ? b.start_time.split("T")[0] : "",
              startTime: b.start_time,
              endTime: b.end_time,
              durationHours: duration,
              people: b.attendees || 1,
              bookedBy: "ฉัน",
              status: b.status || "pending_checkin",
              checkedInAt: b.checked_in_at,
              expiresAt: b.check_in_deadline || null,
            };
          })
        );
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // ฟัง Realtime updates เมื่อสถานะการจองเปลี่ยน
    const channel = supabase
      .channel("checkin-realtime-sub")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchData()
      )
      .subscribe();

    // Timer นับถอยหลัง 15 นาที
    const timer = setInterval(() => {
      setRemainingSecs((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  // ฟังก์ชันยืนยันการเช็คอิน
  const handleCheckIn = async (bookingId: string, roomCode: string) => {
    try {
      setIsCheckingIn(true);
      const nowIso = new Date().toISOString();

      // 1. อัปเดตสถานะในตาราง bookings
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({
          status: "checked_in",
          checked_in_at: nowIso,
        })
        .eq("id", bookingId);

      if (bookingErr) throw bookingErr;

      // 2. อัปเดตสถานะห้องในตาราง rooms
      await supabase
        .from("rooms")
        .update({ status: "in_use" })
        .eq("id", roomCode.toLowerCase());

      alert(`เช็คอินสำเร็จ! เข้าใช้งานห้อง ${roomCode.toUpperCase()} ได้เลยครับ`);
      stopScanner();
      await fetchData();
    } catch (err: any) {
      console.error("Check-in error:", err);
      alert("เกิดข้อผิดพลาดในการเช็คอิน: " + (err.message || err));
    } finally {
      setIsCheckingIn(false);
    }
  };

  // จัดการกล้องสแกน QR Code
  const startScanner = (bookingId: string) => {
    setActiveScanBookingId(bookingId);
    setIsCameraActive(true);

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          const target = bookings.find((b) => b.id === bookingId);
          if (
            target &&
            (decodedText.toLowerCase().includes(target.room.toLowerCase()) ||
              decodedText.toLowerCase().includes("fibo"))
          ) {
            scanner.clear();
            handleCheckIn(bookingId, target.room);
          } else {
            alert(`QR Code ไม่ถูกต้องหรือไม่ตรงกับห้อง ${target?.room}`);
          }
        },
        () => {}
      );

      scannerRef.current = scanner;
    }, 150);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setIsCameraActive(false);
    setActiveScanBookingId(null);
  };

  // กรองรายการที่ต้องเช็คอิน (รับทั้ง pending และ pending_checkin)
  const pendingBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "pending_checkin"
  );

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* ส่วนหัว */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider text-orange-600 uppercase">
            FIBO Physical Verification
          </span>
          <h1 className="text-2xl font-black text-slate-800">Physical Check-In</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            เมื่อเดินทางมาถึงห้องประชุม ให้สแกน Dynamic QR Code บนหน้าจอหน้าห้องเพื่อเริ่มใช้งาน
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-semibold">
            <Clock className="w-4 h-4 animate-pulse text-red-500" />
            นับถอยหลังตัดสิทธิ์: {formatTimer(remainingSecs)} นาที
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            หน้าหลัก
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* คอลัมน์รายการห้องที่ต้องเช็คอิน (ซ้าย) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center justify-between">
            <span>รายการห้องที่ต้องไปยืนยันสิทธิ์หน้าห้อง</span>
            <span className="text-xs font-normal text-slate-500">
              พบ {pendingBookings.length} รายการ
            </span>
          </h2>

          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-400">
              กำลังโหลดข้อมูลการจอง...
            </div>
          ) : pendingBookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                ไม่มีรายการจองที่ต้องยืนยันตัวตนในขณะนี้
              </p>
              <p className="text-xs text-slate-400">
                รายการจองได้รับการเช็คอินครบถ้วนแล้ว หรือยังไม่มีการจองใหม่
              </p>
              <Link
                href="/search"
                className="inline-block mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                ไปหน้าเลือกจองห้อง
              </Link>
            </div>
          ) : (
            pendingBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-orange-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-800 uppercase">
                      {b.room}
                    </span>
                    <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      รอยืนยันสิทธิ์หน้าห้อง
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">รหัสจอง: #{b.id.slice(0, 8)}</span>
                </div>

                <div className="text-sm font-semibold text-slate-700">{b.title}</div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(b.startTime).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(b.endTime).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.people} คน</span>
                  </div>
                </div>

                {/* ปุ่มปฏิบัติการ */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => startScanner(b.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    เปิดกล้องสแกน QR Code หน้าห้อง
                  </button>

                  <button
                    disabled={isCheckingIn}
                    onClick={() => handleCheckIn(b.id, b.room)}
                    className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2.5 px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ยืนยันทันที (จำลอง)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ข้อมูลความปลอดภัยและกติกา (ขวา) */}
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>ระบบป้องกัน Ghost Booking</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              เพื่อป้องกันการจองทิ้งไว้แต่ไม่มาใช้งานจริง ระบบจะบังคับให้ผู้จองต้องเดินทางมาถึงหน้าห้องและสแกน QR Code ภายใน 15 นาที
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-600 font-medium">
              ⚠️ หากไม่สแกนภายใน 15 นาที สิทธิ์การจองจะถูกยกเลิกอัตโนมัติ และระบบจะคืนห้องว่างให้ผู้อื่นทันที
            </div>
          </div>
        </div>
      </div>

      {/* Modal สแกนกล้อง QR Code */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <QrCode className="w-4 h-4 text-orange-500" />
                สแกน Dynamic QR Code หน้าห้อง
              </div>
              <button
                onClick={stopScanner}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              id="reader"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-black"
            ></div>

            <p className="text-[11px] text-center text-slate-400">
              หันกล้องไปที่หน้าจอ Smart Tablet ประจำหน้าห้องเพื่อทำการยืนยัน
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 text-sm font-medium">
          กำลังเตรียมข้อมูลระบบเช็คอิน...
        </div>
      }
    >
      <CheckInContent />
    </Suspense>
  );
}