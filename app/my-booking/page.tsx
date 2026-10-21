"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Building2, ArrowLeft, QrCode, Clock, Calendar, Users, XCircle } from "lucide-react";

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

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // ดึงข้อมูลการจองของผู้ใช้ปัจจุบัน
  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("start_time", { ascending: false });
      console.log("Supabase bookings raw data:", data);
      console.log("Supabase fetch error:", error);
      if (error) {
        console.error("Fetch bookings error:", error);
        return;
      }

      if (data) {
        setBookings(
          data.map((b: any) => {
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);
            const duration = Math.max(
              0,
              (end.getTime() - start.getTime()) / (1000 * 60 * 60)
            );

            return {
              id: b.id,
              room: b.room_id,
              floor: 0,
              title: b.title || "การประชุม",
              date: b.start_time ? b.start_time.split("T")[0] : "",
              startTime: b.start_time,
              endTime: b.end_time,
              durationHours: duration,
              people: b.attendees || 1,
              bookedBy: "ฉัน",
              status: b.status,
              checkedInAt: b.checked_in_at,
              expiresAt: b.check_in_deadline,
            };
          })
        );
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    // ฟัง Realtime event จากตาราง bookings
    const channel = supabase
      .channel("mybooking-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ยกเลิกการจอง
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?")) return;

    setCancellingId(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) {
        alert("ไม่สามารถยกเลิกการจองได้: " + error.message);
      } else {
        await fetchBookings();
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setCancellingId(null);
    }
  };

  // แยกรายการที่กำลังดำเนินการ และ ประวัติที่ผ่านมา
  const activeBookings = bookings.filter(
    (b) =>
      b.status === "pending" ||
      b.status === "pending_checkin" ||
      b.status === "checked_in"
  );

  const pastBookings = bookings.filter(
    (b) =>
      b.status === "completed" ||
      b.status === "cancelled" ||
      b.status === "expired"
  );

  // คำนวณชั่วโมงที่ใช้ไป
  const usedHours = Number(
    activeBookings.reduce((sum, b) => sum + b.durationHours, 0).toFixed(1)
  );
  const remainingQuota = Number(Math.max(0, 4 - usedHours).toFixed(1));

  // ฟังก์ชันจัดฟอร์แมตเวลาแสดงผล
  const formatTimeRange = (startIso: string, endIso: string) => {
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      const startStr = start.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const endStr = end.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${startStr} - ${endStr}`;
    } catch {
      return "-";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Bookings</h1>
            <p className="text-sm text-slate-500">
              จัดการรายการจอง ตรวจสอบสถานะการเช็คอิน หรือยกเลิกสิทธิ์
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-orange-50 border border-orange-200 px-3.5 py-2 rounded-xl text-xs">
              <span className="text-slate-600">โควตาคงเหลือวันนี้: </span>
              <strong className="text-orange-600 font-bold">
                {remainingQuota} ชั่วโมง (ใช้ไป {usedHours} ชม.)
              </strong>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              หน้าหลัก
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 text-slate-400 text-sm">
            กำลังโหลดข้อมูลการจอง...
          </div>
        )}

        {!isLoading && (
          <>
            {/* รายการที่กำลังดำเนินการ */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                รายการที่กำลังดำเนินการ ({activeBookings.length})
              </h2>

              {activeBookings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-sm">
                  ไม่มีรายการจองที่กำลังดำเนินการ
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">
                            {b.room.toUpperCase()}
                          </span>
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                              b.status === "checked_in"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-amber-50 text-amber-600 border border-amber-200"
                            }`}
                          >
                            {b.status === "checked_in"
                              ? "เช็คอินแล้ว"
                              : "รอยืนยันสิทธิ์หน้าห้อง"}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-slate-700">{b.title}</p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {b.date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatTimeRange(b.startTime, b.endTime)} ({b.durationHours} ชม.)
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {b.people} คน
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        {b.status !== "checked_in" && (
                          <Link
                            href="/check-in"
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
                          >
                            <QrCode className="w-4 h-4" />
                            เช็คอิน
                          </Link>
                        )}
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={cancellingId === b.id}
                          className="flex-1 md:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl text-xs font-medium transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {cancellingId === b.id ? "กำลังยกเลิก..." : "ยกเลิก"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ประวัติที่ผ่านมา */}
            <div className="space-y-3 pt-4">
              <h2 className="text-base font-bold text-slate-800">
                ประวัติที่ผ่านมา ({pastBookings.length})
              </h2>

              {pastBookings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs shadow-sm">
                  ไม่มีประวัติการจองที่ผ่านมา
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {pastBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white/70 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-xs opacity-75"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {b.room.toUpperCase()}
                          </span>
                          <span className="text-slate-600">- {b.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            {b.status === "cancelled"
                              ? "ยกเลิกแล้ว"
                              : b.status === "expired"
                              ? "หมดเวลาเช็คอิน"
                              : "เสร็จสิ้น"}
                          </span>
                        </div>
                        <div className="text-slate-400 mt-1">
                          {b.date} • {formatTimeRange(b.startTime, b.endTime)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}