"use client";

import UserNav from "@/components/UserNav";
import { createBooking } from "@/lib/booking";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Room, Booking } from "./data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Bell, Layers, Clock, Zap, X, Users,
  LogOut, Sparkles, CalendarRange, AlertCircle, KeyRound, Monitor
} from "lucide-react";

// สร้างตัวเลือกเวลาแบบ 24 ชั่วโมง ทุกๆ 30 นาที ตั้งแต่ 00:00 ถึง 23:30 น.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function getNextHourString(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const hh = String(d.getHours()).padStart(2, "0");
  return `${hh}:00`;
}

function getNextTwoHoursString(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  const hh = String(d.getHours()).padStart(2, "0");
  return `${hh}:00`;
}

export default function HomePage() {
  const router = useRouter();

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalRoom, setModalRoom] = useState<Room | null>(null);
  const [formTitle, setFormTitle] = useState("ประชุมโปรเจกต์กลุ่ม");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formPeople, setFormPeople] = useState(4);
  const [formName, setFormName] = useState("Thawisap N.");

  const checkAuthAndFetchData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setIsAuthChecking(false);

      if (session.user.email === "admin@fibo.kmutt.ac.th") {
        setIsAdmin(true);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "admin" || session.user.user_metadata?.role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }

      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .order("id");

      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .eq("email", session.user.email)
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
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndFetchData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
      }
    });

    const channel = supabase
      .channel("public-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => checkAuthAndFetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => checkAuthAndFetchData()
      )
      .subscribe();

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [router]);

  const availableCount = rooms.filter((r) => r.status === "available").length;
  const pendingCount = rooms.filter((r) => r.status === "pending").length;
  const inUseCount = rooms.filter((r) => r.status === "in_use").length;

  const activeBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed" || b.status === "checked_in"
  );

  const usedHours = Number(
    activeBookings.reduce((sum, b) => sum + b.durationHours, 0).toFixed(1)
  );
  const remainingQuota = Number(Math.max(0, 4 - usedHours).toFixed(1));

  const calculateSelectedDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    return Number((diffMinutes / 60).toFixed(1));
  };

  const selectedDuration = calculateSelectedDuration(formStart, formEnd);

  const isPastTime = (() => {
    if (!bookingDate || !formStart) return false;
    const selectedDateTime = new Date(`${bookingDate}T${formStart}:00`);
    const now = new Date();
    return selectedDateTime < now;
  })();

  const isTimeInvalid = selectedDuration <= 0 || isPastTime;
  const isOverSingleLimit = selectedDuration > 4;
  const isOverDailyQuota = selectedDuration > remainingQuota;

  const isTimeConflicting = activeBookings.some((b) => {
    if (!modalRoom || b.room !== modalRoom.id) return false;
    const [startH, startM] = formStart.split(":").map(Number);
    const [endH, endM] = formEnd.split(":").map(Number);
    const [bStartH, bStartM] = b.startTime.split(":").map(Number);
    const [bEndH, bEndM] = b.endTime.split(":").map(Number);
    const reqStart = startH * 60 + (startM || 0);
    const reqEnd = endH * 60 + (endM || 0);
    const existStart = bStartH * 60 + (bStartM || 0);
    const existEnd = bEndH * 60 + (bEndM || 0);
    return Math.max(reqStart, existStart) < Math.min(reqEnd, existEnd);
  });

  const canSubmitBooking =
    !isTimeInvalid && !isOverSingleLimit && !isOverDailyQuota && !isTimeConflicting;

  const handleOpenModal = (room: Room) => {
    setModalRoom(room);
    setFormPeople(Math.min(4, room.capacity));
    setFormStart(getNextHourString());
    setFormEnd(getNextTwoHoursString());
  };

  const handleConfirmBooking = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!modalRoom || !canSubmitBooking) return;

    setIsLoading(true);
    try {
      const startTime = new Date(`${bookingDate}T${formStart}:00`).toISOString();
      const endTime = new Date(`${bookingDate}T${formEnd}:00`).toISOString();

      await createBooking({
        roomId: modalRoom.id,
        title: formTitle,
        startTime,
        endTime,
        attendees: formPeople,
      });

      setModalRoom(null);
      router.push("/booking-confirmed");
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    try {
      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId);

      await supabase
        .from("rooms")
        .update({ status: "available", next_available: "Now" })
        .eq("id", target.room);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const visibleRooms = rooms.filter((r) => {
    const matchFloor = floorFilter === "all" || r.floor === floorFilter;
    const matchSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.amenities.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchFloor && matchSearch;
  });

  const renderBadge = (status: Room["status"]) => {
    const styles = {
      available: "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold",
      pending: "bg-amber-50 text-amber-700 border-amber-300 font-bold",
      in_use: "bg-rose-50 text-rose-700 border-rose-300 font-bold",
      unavailable: "bg-slate-100 text-slate-600 border-slate-300 font-bold",
    };
    const dotColors = {
      available: "bg-emerald-500",
      pending: "bg-amber-500",
      in_use: "bg-rose-500",
      unavailable: "bg-slate-400",
    };
    const labels = {
      available: "Available",
      pending: "Pending",
      in_use: "In Use",
      unavailable: "Unavailable",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] border px-2.5 py-0.5 rounded-full ${styles[status]}`}>
        <span className="relative flex h-1.5 w-1.5">
          {(status === "available" || status === "pending") && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[status]}`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColors[status]}`}></span>
        </span>
        {labels[status]}
      </span>
    );
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white space-y-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-300 tracking-wider uppercase">
          กำลังตรวจสอบสิทธิ์การเข้าใช้งานระบบ...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Top Header จัดลำดับใหม่: ค้นหา -> ปุ่ม Admin -> โควตา -> เวลา -> แจ้งเตือน -> เมนู Profile/Logout (ขวาสุด) */}
      <header className="px-4 sm:px-6 lg:px-8 py-3 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between sticky top-0 z-20">
        <div className="relative flex-1 max-w-sm mr-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาห้อง FB หรืออุปกรณ์..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-100 focus:bg-white text-xs border border-transparent focus:border-orange-500 rounded-full outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {isAdmin && (
            <Link
              href="/kiosk"
              className="hidden lg:flex items-center gap-2 bg-slate-900 hover:bg-orange-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Monitor className="w-4 h-4 text-orange-400" />
              <span>เปิดจอ Kiosk (Admin)</span>
            </Link>
          )}

          <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/70 px-3.5 py-1.5 rounded-full text-xs">
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-slate-600 font-medium">โควตา:</span>
            <span className={`font-black ${remainingQuota === 0 ? "text-rose-600" : "text-orange-600"}`}>
              {remainingQuota}/4 ชม.
            </span>
          </div>

          <div className="text-right border-l pl-3 sm:pl-4 border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:block">เวลาจริง (24H)</p>
            <p className="text-sm sm:text-base font-black text-slate-800 leading-none font-mono">
              {currentTime || "--:--:--"}
            </p>
          </div>

          <Link
            href="/my-booking"
            className="relative p-2 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-full transition-all"
          >
            <Bell className="w-5 h-5" />
            {activeBookings.length > 0 && (
              <span className="w-2.5 h-2.5 bg-orange-600 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse"></span>
            )}
          </Link>

          {/* UserNav อยู่ตำแหน่งขวาสุดของ Header แล้ว */}
          <div className="pl-1">
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1550px] w-full mx-auto">
        <div className="bg-gradient-to-r from-[#111827] via-[#1F2937] to-[#EA580C] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold bg-orange-500/20 border border-orange-400/30 px-3 py-1 rounded-full text-orange-300">
              <Sparkles className="w-3.5 h-3.5" /> FIBO Smart Room Reservation (Live Supabase DB)
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Find Your Space at FIBO</h2>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl">
              ระบบจองห้องเรียนและห้องประชุมอัจฉริยะ ตรวจสอบสถานะแบบเรียลไทม์ และสแกน QR Code หน้าห้องเพื่อเช็คอิน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {isAdmin && (
              <Link
                href="/kiosk"
                className="flex md:hidden flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold shadow-lg items-center justify-center gap-2"
              >
                <Monitor className="w-4 h-4 text-orange-400" /> เปิดจอ Kiosk (Admin)
              </Link>
            )}
            <Link
              href="/schedule"
              className="flex-1 md:flex-initial px-4 py-3 rounded-2xl bg-white text-slate-900 hover:bg-orange-50 active:scale-95 text-xs font-extrabold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <CalendarRange className="w-4 h-4 text-orange-600" /> ตารางรวม (Timeline)
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{rooms.length}</p>
              <p className="text-[11px] font-medium text-slate-400">Total Rooms</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-200/70"></div>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600">{availableCount}</p>
              <p className="text-[11px] font-medium text-slate-400">Available Now</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 ring-4 ring-amber-200/70"></div>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
              <p className="text-[11px] font-medium text-slate-400">Pending</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
              <div className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-200/70"></div>
            </div>
            <div>
              <p className="text-2xl font-black text-rose-600">{inUseCount}</p>
              <p className="text-[11px] font-medium text-slate-400">In Use</p>
            </div>
          </div>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl overflow-x-auto w-fit">
              {(["all", 2, 3, 4, 5, 6] as const).map((fl) => (
                <button
                  key={fl}
                  onClick={() => setFloorFilter(fl)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    floorFilter === fl
                      ? "bg-[#EA580C] text-white shadow-md shadow-orange-600/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  {fl === "all" ? "All Floors" : `Floor ${fl}`}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center font-bold text-slate-500 text-xs">
                กำลังเชื่อมต่อข้อมูลจากตึก FIBO (Supabase)...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-orange-300 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Floor {room.floor}
                          </span>
                          <h3 className="text-xl font-black text-slate-800">{room.id}</h3>
                        </div>
                        {renderBadge(room.status)}
                      </div>

                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Users className="w-3.5 h-3.5 text-orange-500" />
                        <span>{room.capacity} people • {room.type}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {room.amenities.map((item, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg font-medium">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 space-y-2.5">
                      <div className="text-[11px] flex justify-between items-center">
                        <span className="text-slate-400">Status</span>
                        <span className="font-bold text-slate-700">{room.nextAvailable}</span>
                      </div>

                      <div className="flex gap-1.5">
                        {room.status === "available" ? (
                          <button
                            onClick={() => handleOpenModal(room)}
                            className="flex-1 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-orange-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5"
                          >
                            <Zap className="w-3.5 h-3.5" /> Quick Book
                          </button>
                        ) : room.status === "pending" ? (
                          <Link
                            href="/check-in"
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Check-In
                          </Link>
                        ) : (
                          <button disabled className="flex-1 bg-slate-100 text-slate-400 text-xs font-semibold py-2.5 rounded-xl cursor-not-allowed">
                            Not Available
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Widget */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-5">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daily Quota</span>
                <span className="text-xs font-black text-orange-600">{usedHours} / 4 hrs</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    remainingQuota === 0
                      ? "bg-gradient-to-r from-rose-500 to-red-600"
                      : "bg-gradient-to-r from-[#EA580C] to-[#F59E0B]"
                  }`}
                  style={{ width: `${Math.min(100, (usedHours / 4) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-500">
                สิทธิ์จองคงเหลือวันนี้ <span className="font-bold text-slate-800">{remainingQuota} ชั่วโมง</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Pass</h4>
                <Link href="/my-booking" className="text-[11px] text-orange-600 hover:underline font-semibold">
                  View all ({activeBookings.length})
                </Link>
              </div>

              {activeBookings.length > 0 ? (
                <div className="p-4 bg-gradient-to-br from-slate-50 to-orange-50/40 rounded-2xl border border-orange-200/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-slate-900">{activeBookings[0].room}</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      activeBookings[0].status === "checked_in" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {activeBookings[0].status === "checked_in" ? "In Room" : "Waiting Check-in"}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-700">{activeBookings[0].title}</p>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div>เวลา: {activeBookings[0].startTime} – {activeBookings[0].endTime}</div>
                  </div>
                  {activeBookings[0].status === "pending" ? (
                    <Link
                      href="/check-in"
                      className="w-full bg-[#EA580C] hover:bg-orange-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> ไปหน้า Check-In
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleCompleteBooking(activeBookings[0].id)}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> คืนห้อง (Check Out)
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">ไม่มีรายการจองที่ค้างอยู่</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Popup จองห้องพร้อม Dropdown เวลา 24 ชม. */}
      {modalRoom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 text-slate-800">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">จองห้อง {modalRoom.id}</h3>
                <p className="text-xs text-slate-500 font-medium">ชั้น {modalRoom.floor} • รองรับ {modalRoom.capacity} คน</p>
              </div>
              <button 
                onClick={() => setModalRoom(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">หัวข้อการใช้งาน</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-semibold border border-slate-200 rounded-xl p-2.5 outline-none focus:border-orange-500 transition-colors"
                  placeholder="เช่น ประชุมโปรเจกต์กลุ่ม"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">วันที่ต้องการใช้งาน</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                />
              </div>

              {/* ปรับเป็น Dropdown 24 ชม. */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เวลาเริ่ม (24 ชม.)</label>
                  <select
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-bold border border-slate-200 rounded-xl p-2.5 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={`start-${time}`} value={time}>
                        {time} น.
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เวลาสิ้นสุด (24 ชม.)</label>
                  <select
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-bold border border-slate-200 rounded-xl p-2.5 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={`end-${time}`} value={time}>
                        {time} น.
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                  canSubmitBooking
                    ? "bg-orange-50 border-orange-200/80 text-orange-950"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-600" />
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900">
                    ระยะเวลาที่เลือก: {selectedDuration > 0 ? `${selectedDuration} ชม.` : "ช่วงเวลาไม่ถูกต้อง"}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    โควตาคงเหลือวันนี้: <strong className="text-orange-600 font-black">{remainingQuota} ชั่วโมง</strong>
                  </p>

                  {isPastTime && (
                    <p className="text-[11px] font-bold text-rose-600">
                      ⚠️ ไม่สามารถจองเวลาย้อนหลังได้
                    </p>
                  )}

                  {isTimeConflicting && (
                    <p className="text-[11px] font-bold text-rose-600">
                      ⚠️ ช่วงเวลานี้มีคนจองห้องนี้ไว้แล้ว กรุณาเลือกเวลาอื่น
                    </p>
                  )}

                  {isOverDailyQuota && !isTimeConflicting && !isPastTime && (
                    <p className="text-[11px] font-bold text-rose-600">
                      ⚠️ เกินโควตาคงเหลือ ({remainingQuota} ชม.)
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">จำนวนคน</label>
                  <input
                    type="number"
                    min={1}
                    max={modalRoom.capacity}
                    value={formPeople}
                    onChange={(e) => setFormPeople(Number(e.target.value))}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-bold border border-slate-200 rounded-xl p-2.5 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อผู้จอง</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-semibold border border-slate-200 rounded-xl p-2.5 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setModalRoom(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={(e) => handleConfirmBooking(e)}
                disabled={!canSubmitBooking}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  canSubmitBooking
                    ? "bg-[#EA580C] hover:bg-orange-700 active:scale-95 text-white shadow-md shadow-orange-600/20"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                ยืนยันการจอง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}