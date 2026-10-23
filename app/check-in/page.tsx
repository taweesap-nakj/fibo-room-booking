"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  Camera,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Users,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface PendingBooking {
  id: string;
  room_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  people: number;
  status: string;
}

export default function CheckInPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanningBooking, setScanningBooking] = useState<PendingBooking | null>(null);
  const [scanError, setScanError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successRoom, setSuccessRoom] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  const fetchUserPendingBookings = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.email) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("email", session.user.email)
        .eq("status", "pending")
        .order("start_time", { ascending: true });

      if (!error && data) {
        setBookings(data);
      }
    } catch (err) {
      console.error("Error loading check-in bookings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPendingBookings();
  }, []);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.error("Stop scanner error:", e);
      }
      scannerRef.current = null;
    }
    setScanningBooking(null);
  };

  // เปิดใช้งานกล้องและถอดรหัสผ่าน html5-qrcode
  useEffect(() => {
    if (!scanningBooking) return;

    let isMounted = true;

    const startScanner = async () => {
      // รอให้ Element render เสร็จใน DOM
      await new Promise((resolve) => setTimeout(resolve, 350));

      const qrRegion = document.getElementById("qr-reader-view");
      if (!qrRegion || !isMounted) return;

      try {
        const html5Qr = new Html5Qrcode("qr-reader-view");
        scannerRef.current = html5Qr;

        await html5Qr.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            const rawText = decodedText.trim().toUpperCase();
            const targetRoom = scanningBooking.room_id.trim().toUpperCase();

            if (rawText === targetRoom || rawText.includes(targetRoom)) {
              await stopCamera();
              handleConfirmCheckIn(scanningBooking);
            } else {
              setScanError(`QR ไม่ตรงกับห้อง ${scanningBooking.room_id} (อ่านได้: ${rawText})`);
            }
          },
          () => {} // callback เมื่อไม่พบ QR ในเฟรม (ปล่อยว่าง)
        );
      } catch (err) {
        console.error("Scanner start error:", err);
        if (isMounted) {
          setScanError("ไม่สามารถเปิดกล้องได้ กรุณารีเฟรชหน้าเว็บและตรวจสอบการอนุญาตกล้อง");
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [scanningBooking]);

  const handleConfirmCheckIn = async (booking: PendingBooking) => {
    setIsProcessing(true);
    setScanError("");

    try {
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({
          status: "checked_in",
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (bookingErr) throw bookingErr;

      const { error: roomErr } = await supabase
        .from("rooms")
        .update({
          status: "in_use",
          next_available: "Occupied",
        })
        .eq("id", booking.room_id);

      if (roomErr) throw roomErr;

      setSuccessRoom(booking.room_id);
      fetchUserPendingBookings();
    } catch (err: any) {
      setScanError(err.message || "เกิดข้อผิดพลาดในการเช็คอิน");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (isoOrTime: string) => {
    if (!isoOrTime) return "--:--";
    if (isoOrTime.includes("T")) {
      return new Date(isoOrTime).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return isoOrTime;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
              SMART VERIFICATION
            </span>
            <h1 className="text-2xl font-black text-slate-900">เช็คอินเข้าใช้งานห้อง (Check-In)</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              สแกน QR Code จากแท็บเล็ตหน้าห้องเพื่อยืนยันการเข้าใช้งานจริง
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
          </Link>
        </div>

        {successRoom && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-emerald-900 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base">เช็คอินห้อง {successRoom} สำเร็จ!</h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  ระบบได้เปลี่ยนสถานะห้องเป็น "กำลังใช้งาน (In Use)" เรียบร้อยแล้ว
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              ไปหน้าหลัก
            </Link>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            รายการจองที่รอเช็คอินของคุณ ({bookings.length})
          </h2>

          {isLoading ? (
            <p className="text-xs text-slate-400 py-8 text-center">กำลังโหลดรายการจอง...</p>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <QrCode className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-600">ไม่มีรายการที่รอเช็คอินในขณะนี้</p>
              <p className="text-xs text-slate-400">
                หากคุณยังไม่ได้จองห้อง สามารถกลับไปเลือกจองห้องว่างได้ที่หน้าแรก
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50/40 to-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-900">{b.room_id}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                        รอสแกนเข้าห้อง
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{b.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-orange-500" />
                        {b.people || 1} คน
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setScanError("");
                      setScanningBooking(b);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#EA580C] hover:bg-orange-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-orange-600/20 transition-all"
                  >
                    <Camera className="w-4 h-4" /> สแกน QR หน้าห้อง
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {scanningBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  สแกน QR Code ห้อง {scanningBooking.room_id}
                </h3>
                <p className="text-xs text-slate-500">หันกล้องไปที่จอ Kiosk หน้าห้องเพื่อเช็คอิน</p>
              </div>
              <button
                onClick={stopCamera}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
              <div id="qr-reader-view" className="w-full h-full [&_video]:object-cover" />
            </div>

            {scanError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {isProcessing && (
              <p className="text-center text-xs font-bold text-orange-600">
                กำลังยืนยันการเช็คอิน...
              </p>
            )}

            <button
              onClick={stopCamera}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}