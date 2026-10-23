"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // ฟังก์ชันหยุดการทำงานของกล้องและล้างค่า
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanningBooking(null);
  };

  // เปิด-ปิดกล้องและลูปตรวจจับ QR Code ตามสถานะของ scanningBooking
  useEffect(() => {
    if (!scanningBooking) return;

    let isSubscribed = true;

    const startCameraStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.muted = true;
          await videoRef.current.play();

          // เริ่มตรวจจับ QR Code ทันทีที่ภาพขึ้น
          startQrLoop(scanningBooking);
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (isSubscribed) {
          setScanError("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์");
        }
      }
    };

    startCameraStream();

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [scanningBooking]);

  // ลูปตรวจจับ QR Code จากวิดีโอ
  const startQrLoop = (booking: PendingBooking) => {
    const hasDetector = "BarcodeDetector" in window;
    const detector = hasDetector
      ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
      : null;

    const scanFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        if (detector) {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawText = barcodes[0].rawValue.trim().toUpperCase();
            const targetRoom = booking.room_id.trim().toUpperCase();

            // เช็คว่า QR ตรงกับห้องหรือไม่ (รองรับทั้ง FB201, FIBO-ROOM-FB201 หรือมีชื่อห้องอยู่ข้างใน)
            if (rawText === targetRoom || rawText.includes(targetRoom)) {
              stopCamera();
              handleConfirmCheckIn(booking);
              return;
            } else {
              setScanError(`QR ไม่ตรงกับห้อง ${booking.room_id} (อ่านได้: ${rawText})`);
            }
          }
        }
      } catch (e) {
        // ข้ามเฟรมที่มีปัญหา
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // ยืนยัน Check-in ไปยัง Supabase
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

      stopCamera();
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
        {/* Header */}
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

        {/* แจ้งเตือนเมื่อเช็คอินสำเร็จ */}
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

        {/* รายการที่รอเช็คอิน */}
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

      {/* Modal สแกนกล้อง (ไม่มีช่อง PIN ให้กวนใจ) */}
      {scanningBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
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

            <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-8 border-2 border-orange-500/80 rounded-2xl pointer-events-none animate-pulse"></div>
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