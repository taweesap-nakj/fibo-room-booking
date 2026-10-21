"use client";

import { autoReleaseExpiredBookings } from "@/lib/booking";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Plus, Clock, Calendar } from "lucide-react";

const TIMELINE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

interface RoomItem {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  status: string;
}

interface ScheduleBooking {
  id: string;
  room: string;
  title: string;
  date: string;
  startHour: number;
  endHour: number;
  startTimeStr: string;
  endTimeStr: string;
  status: string;
  people: number;
}

export default function SchedulePage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentHour, setCurrentHour] = useState<number>(new Date().getHours());
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  const fetchScheduleData = async () => {
    try {
      await autoReleaseExpiredBookings();
      // 1. ดึงข้อมูลห้อง
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .order("id", { ascending: true });

      if (roomsData && roomsData.length > 0) {
        setRooms(
          roomsData.map((r: any) => ({
            id: r.id,
            name: r.name || r.id.toUpperCase(),
            floor: Number(r.floor) || Number(String(r.id).replace(/\D/g, "")[0]) || 3,
            capacity: r.capacity || 8,
            status: r.status || "available",
          }))
        );
      } else {
        setRooms([
          { id: "fibo-301", name: "FIBO-301", floor: 3, capacity: 8, status: "available" },
          { id: "fibo-402", name: "FIBO-402", floor: 4, capacity: 12, status: "available" },
          { id: "fibo-505", name: "FIBO-505", floor: 5, capacity: 20, status: "available" },
        ]);
      }

      // 2. ดึงข้อมูลการจอง
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select("*")
        .in("status", ["pending", "checked_in"])
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Schedule fetch error:", error);
        return;
      }

      if (bookingsData) {
        const mapped: ScheduleBooking[] = bookingsData
          .filter(
            (b: any) =>
              b.status !== "cancelled" &&
              b.status !== "expired"
          )
          .map((b: any) => {
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);

            const year = start.getFullYear();
            const month = String(start.getMonth() + 1).padStart(2, "0");
            const day = String(start.getDate()).padStart(2, "0");
            const localDateStr = `${year}-${month}-${day}`;

            const startH = start.getHours() + start.getMinutes() / 60;
            const endH = end.getHours() + end.getMinutes() / 60;

            return {
              id: b.id,
              room: String(b.room_id || "").toLowerCase(),
              title: b.title || "การประชุม",
              date: localDateStr,
              startHour: startH,
              endHour: endH > startH ? endH : startH + 1,
              startTimeStr: start.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
              endTimeStr: end.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
              status: b.status || "pending_checkin",
              people: b.attendees || 1,
            };
          });

        setBookings(mapped);
      }
    } catch (err) {
      console.error("Error loading schedule:", err);
    }
  };

  useEffect(() => {
    fetchScheduleData();

    const updateClock = () => {
      const now = new Date();
      setCurrentHour(now.getHours());
      setCurrentTimeStr(
        now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 5000);

    const channel = supabase
      .channel("schedule-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchScheduleData()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const visibleRooms = rooms.filter(
    (r) => floorFilter === "all" || r.floor === floorFilter
  );

  const bookingsForDate = bookings.filter((b) => b.date === selectedDate);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1550px] w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Room Schedule Timeline
          </h1>
          <p className="text-sm text-slate-500">
            ตารางการใช้ห้องเรียนและห้องประชุมแบบเรียลไทม์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentTimeStr && (
            <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              เวลาปัจจุบัน: {currentTimeStr} น.
            </div>
          )}

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-sm"
          />

          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            จองห้องเพิ่ม
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            หน้าหลัก
          </Link>
        </div>
      </div>

      {/* Floor Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(["all", 3, 4, 5] as const).map((fl) => (
            <button
              key={fl}
              onClick={() => setFloorFilter(fl)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                floorFilter === fl
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {fl === "all" ? "ทุกชั้น (All Floors)" : `ชั้น ${fl}`}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          รายการในวันที่เลือก ({selectedDate}):{" "}
          <strong className="text-slate-800">{bookingsForDate.length} รายการ</strong>{" "}
          (ทั้งหมดในระบบ {bookings.length} รายการ)
        </div>
      </div>

      {/* รายการจองทั้งหมดที่ยังไม่จบ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-500" />
          รายการจองทั้งหมด ({bookings.length} รายการ)
        </h2>

        {bookings.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            ยังไม่มีรายการจองในระบบ
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2 bg-slate-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm uppercase">
                    {b.room}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      b.status === "checked_in"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-amber-50 text-amber-600 border border-amber-200"
                    }`}
                  >
                    {b.status === "checked_in" ? "เช็คอินแล้ว" : "รอเช็คอิน"}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-700">{b.title}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>📅 {b.date}</span>
                  <span>⏰ {b.startTimeStr} - {b.endTimeStr}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[180px_repeat(13,1fr)] border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <div className="p-3.5 border-r border-slate-200">ห้อง / เวลา</div>
            {TIMELINE_HOURS.map((hr) => (
              <div
                key={hr}
                className={`p-3 text-center border-r border-slate-100 ${
                  hr === currentHour ? "bg-orange-50 text-orange-600 font-bold" : ""
                }`}
              >
                {String(hr).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {visibleRooms.map((room) => {
            const roomBookings = bookingsForDate.filter(
              (b) => b.room.toLowerCase() === room.id.toLowerCase()
            );

            return (
              <div
                key={room.id}
                className="grid grid-cols-[180px_repeat(13,1fr)] border-b border-slate-100 hover:bg-slate-50/40 transition-colors"
              >
                <div className="p-3.5 border-r border-slate-200 flex flex-col justify-center">
                  <span className="font-bold text-slate-800 text-sm uppercase">
                    {room.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ชั้น {room.floor} • {room.capacity} คน
                  </span>
                </div>

                {TIMELINE_HOURS.map((hr) => {
                  const hit = roomBookings.find(
                    (b) => Math.floor(b.startHour) <= hr && Math.ceil(b.endHour) > hr
                  );

                  return (
                    <div
                      key={hr}
                      className="p-1.5 border-r border-slate-100 min-h-[60px] flex items-center justify-center"
                    >
                      {hit ? (
                        <div
                          className={`w-full h-full rounded-lg p-1.5 text-[10px] leading-tight flex flex-col justify-center ${
                            hit.status === "checked_in"
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "bg-orange-500 text-white shadow-sm"
                          }`}
                        >
                          <span className="font-bold truncate">{hit.title}</span>
                          <span className="opacity-90">
                            {hit.startTimeStr}-{hit.endTimeStr}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}