"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROOMS_DATA as INITIAL_ROOMS, Room } from "./data";
import { createBooking } from "@/lib/booking";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Search,
  Calendar,
  KeyRound,
  Users,
  Zap,
  Layers,
  Clock,
  X,
  Plus,
  LogOut,
  Bot,
  Sparkles,
  Cpu,
  ArrowRight,
} from "lucide-react";

const getLocalDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function Home() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");

  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [modalRoom, setModalRoom] = useState<Room | null>(null);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(getLocalDateStr());
  const [formStart, setFormStart] = useState<string>("09:00");
  const [formEnd, setFormEnd] = useState<string>("10:00");
  const [formPeople, setFormPeople] = useState<number>(4);
  const [formName, setFormName] = useState<string>("");
  const [activeTimePicker, setActiveTimePicker] = useState<"start" | "end">("start");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [timeOutAlertBooking, setTimeOutAlertBooking] = useState<any | null>(null);

  const [showSmartMatchModal, setShowSmartMatchModal] = useState<boolean>(false);
  const [smartPeopleGroup, setSmartPeopleGroup] = useState<number>(4);

  const [showAddRoomModal, setShowAddRoomModal] = useState<boolean>(false);
  const [newRoomId, setNewRoomId] = useState<string>("");
  const [newRoomFloor, setNewRoomFloor] = useState<number>(2);
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(20);
  const [newRoomType, setNewRoomType] = useState<string>("Lecture Room");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);

  const todayStr = getLocalDateStr();
  const tomorrowStr = getLocalDateStr(new Date(Date.now() + 86400000));

  const fetchSystemData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const email = session.user.email || "";
      const fullName =
        session.user.user_metadata?.full_name ||
        email.split("@")[0] ||
        "ผู้ใช้งาน";

      setUserEmail(email);
      setUserName(fullName);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const adminCheck =
        email === "admin@fibo.kmutt.ac.th" ||
        profile?.role === "admin" ||
        session.user.user_metadata?.role === "admin";
      setIsAdmin(adminCheck);

      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .order("id", { ascending: true });

      if (roomsData && roomsData.length > 0) {
        const cleanRooms = roomsData
          .filter(
            (r: any) =>
              !String(r.id).startsWith("SB-") &&
              !String(r.id).startsWith("FIBO-")
          )
          .map((r: any) => ({
            id: r.id,
            floor: Number(r.floor) || 2,
            capacity: Number(r.capacity) || 10,
            type: r.type || "Meeting Room",
            status: r.status || "available",
            nextAvailable: r.next_available || "Now",
          }));
        setRooms(cleanRooms);
      }

      const { data: allBookingsData } = await supabase
        .from("bookings")
        .select("*")
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (allBookingsData) {
        setAllBookings(allBookingsData);
        setMyBookings(allBookingsData.filter((b: any) => b.email === email));

        const myCompleted = allBookingsData.filter(
          (b: any) => b.email === email && b.status === "completed"
        );

        for (const b of myCompleted) {
          const notifiedKey = `notified_timeout_${b.id}`;
          if (!localStorage.getItem(notifiedKey)) {
            setTimeOutAlertBooking(b);
            localStorage.setItem(notifiedKey, "true");
            break;
          }
        }
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    fetchSystemData();

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }, 1000);

    const channel = supabase
      .channel("home-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchSystemData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => fetchSystemData()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const getRoomRealtimeStatus = (roomId: string): "available" | "pending" | "in_use" => {
    const nowMs = Date.now();

    const checkedInBooking = allBookings.find((b) => {
      if (b.room_id !== roomId || b.status !== "checked_in") return false;
      const endMs = new Date(b.end_time).getTime();
      return isNaN(endMs) ? true : endMs > nowMs;
    });
    if (checkedInBooking) return "in_use";

    const pendingBooking = allBookings.find((b) => {
      if (b.room_id !== roomId || b.status !== "pending") return false;
      const startMs = new Date(b.start_time).getTime();
      const endMs = new Date(b.end_time).getTime();
      if (isNaN(startMs) || isNaN(endMs)) return false;
      return nowMs >= startMs - 15 * 60 * 1000 && nowMs < endMs;
    });
    if (pendingBooking) return "pending";

    return "available";
  };

  const totalRoomsCount = rooms.length;
  const inUseCount = rooms.filter((r) => getRoomRealtimeStatus(r.id) === "in_use").length;
  const pendingCount = rooms.filter((r) => getRoomRealtimeStatus(r.id) === "pending").length;
  const availableCount = totalRoomsCount - inUseCount - pendingCount;

  const usedHoursToday = myBookings
    .filter((b) => b.date === todayStr && b.status !== "cancelled")
    .reduce((sum, b) => sum + (Number(b.duration_hours) || 0), 0);
  const remainingQuota = Math.max(0, Number((4 - usedHoursToday).toFixed(2)));

  const myActiveBookings = myBookings.filter((b) => {
    if (b.status !== "pending" && b.status !== "checked_in") return false;
    const endMs = new Date(b.end_time).getTime();
    return isNaN(endMs) ? true : endMs > Date.now();
  });

  const handleOpenModal = (room: Room) => {
    setModalRoom(room);
    setFormTitle("");
    setFormName(userName);
    setFormDate(todayStr);
    setFormPeople(Math.min(4, room.capacity));

    const now = new Date();
    const nextFive = Math.ceil((now.getMinutes() + 1) / 5) * 5;
    now.setMinutes(nextFive, 0, 0);
    const sh = String(now.getHours()).padStart(2, "0");
    const sm = String(now.getMinutes()).padStart(2, "0");
    setFormStart(`${sh}:${sm}`);

    const end = new Date(now.getTime() + 30 * 60000);
    const eh = String(end.getHours()).padStart(2, "0");
    const em = String(end.getMinutes()).padStart(2, "0");
    setFormEnd(`${eh}:${em}`);
  };

  const isTimeSlotTaken = (timeStr: string) => {
    if (!modalRoom) return false;
    const slotMs = new Date(`${formDate}T${timeStr}:00`).getTime();
    return allBookings.some((b) => {
      if (b.room_id !== modalRoom.id) return false;
      if (b.status !== "pending" && b.status !== "checked_in") return false;
      const startMs = new Date(b.start_time).getTime();
      const endMs = new Date(b.end_time).getTime();
      return slotMs >= startMs && slotMs < endMs;
    });
  };

  const isTimeInPast = (timeStr: string) => {
    if (formDate !== todayStr) return false;
    const now = new Date();
    const [h, m] = timeStr.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    return target.getTime() < now.getTime();
  };

  const getBookingDurationHours = () => {
    if (!formStart || !formEnd) return 0;
    const [sh, sm] = formStart.split(":").map(Number);
    const [eh, em] = formEnd.split(":").map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin <= startMin) {
      endMin += 24 * 60;
    }
    const diff = (endMin - startMin) / 60;
    return Number(diff.toFixed(2));
  };

  const modalRoomBookingsOnDate = modalRoom
    ? allBookings.filter(
        (b) =>
          b.room_id === modalRoom.id &&
          b.date === formDate &&
          (b.status === "pending" || b.status === "checked_in")
      )
    : [];

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRoom) return;

    if (!formTitle.trim()) {
      alert("กรุณากรอกหัวข้อการใช้งานห้อง");
      return;
    }

    if (isTimeInPast(formStart)) {
      alert("ไม่สามารถเลือกเวลาเริ่มต้นในอดีตได้");
      return;
    }

    const duration = getBookingDurationHours();
    if (duration <= 0) {
      alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
      return;
    }
    if (duration > 4) {
      alert("ไม่สามารถจองเกิน 4 ชั่วโมงต่อครั้งได้");
      return;
    }

    setIsSubmitting(true);
    try {
      const startIso = `${formDate}T${formStart}:00`;
      const endIso = `${formDate}T${formEnd}:00`;

      await createBooking({
        roomId: modalRoom.id,
        title: formTitle.trim(),
        startTime: startIso,
        endTime: endIso,
        attendees: formPeople,
      });

      setModalRoom(null);
      router.push("/booking-confirmed");
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการจอง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async (booking: any) => {
    if (!confirm(`ยืนยันการคืนห้อง ${booking.room_id} ใช่หรือไม่? (โควตาชั่วโมงที่ใช้ไปจะไม่ถูกคืน)`))
      return;

    try {
      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);

      await supabase
        .from("rooms")
        .update({ status: "available", next_available: "Now" })
        .eq("id", booking.room_id);

      fetchSystemData();
    } catch (err) {
      console.error("Check-out error:", err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newRoomId.trim().toUpperCase();
    if (!cleanId) return;

    setIsCreatingRoom(true);
    try {
      const { error } = await supabase.from("rooms").insert([
        {
          id: cleanId,
          floor: Number(newRoomFloor),
          capacity: Number(newRoomCapacity),
          type: newRoomType,
          status: "available",
          next_available: "Now",
        },
      ]);

      if (error) throw error;

      setShowAddRoomModal(false);
      setNewRoomId("");
      fetchSystemData();
      alert(`เพิ่มห้อง ${cleanId} สำเร็จเรียบร้อย!`);
    } catch (err: any) {
      alert("ไม่สามารถสร้างห้องได้: " + err.message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const getSmartRecommendedRoom = () => {
    const availableRooms = rooms.filter((r) => getRoomRealtimeStatus(r.id) === "available");
    if (availableRooms.length === 0) return null;

    const fittingRooms = availableRooms.filter((r) => r.capacity >= smartPeopleGroup);
    if (fittingRooms.length > 0) {
      return fittingRooms.sort((a, b) => a.capacity - b.capacity)[0];
    }
    return availableRooms[0];
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const formatTimeShort = (isoStr: string) => {
    if (!isoStr) return "--:--";
    if (isoStr.includes("T")) {
      return new Date(isoStr).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return isoStr;
  };

  const visibleRooms = rooms.filter((r) => {
    const matchFloor =
      selectedFloor === "All" || r.floor === Number(selectedFloor);
    const matchSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFloor && matchSearch;
  });

  const renderBadge = (status: "available" | "pending" | "in_use") => {
    if (status === "available") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Available
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        In Use
      </span>
    );
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-bold text-slate-500">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <Bot className="w-4 h-4 text-orange-500 animate-spin" />
          กำลังเชื่อมต่อระบบฐานข้อมูล FIBO...
        </div>
      </div>
    );
  }

  const smartRoom = getSmartRecommendedRoom();

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-screen font-sans text-slate-900">
      {/* Top Navbar */}
      {/* Top Navbar: Responsive 2-Row on Mobile, 1-Row on Desktop */}
      <header className="fibo-glass-nav px-4 sm:px-6 py-2.5 sm:py-3.5 sticky top-0 z-20 transition-all">
        {/* Mobile Only: แถบโปรไฟล์ผู้ใช้ + โควตา + ปุ่มออกจากระบบ */}
        <div className="flex items-center justify-between gap-2 lg:hidden pb-2 mb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/20 p-1 flex items-center justify-center shrink-0">
              <img
                src="/logo.svg"
                alt="FIBO"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 truncate flex items-center gap-1">
                {userName}
                {isAdmin && (
                  <span className="text-[9px] bg-orange-600 text-white font-bold px-1.5 py-0.2 rounded-md">
                    ADMIN
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {userEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 px-2 py-1 rounded-xl text-[10px] font-bold text-orange-700">
              <Clock className="w-3 h-3 text-orange-600" />
              <span>{remainingQuota}/4 ชม.</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 active:scale-95 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* แถบค้นหา + ปุ่ม Action หลัก */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาห้อง เช่น FB201, Meeting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-2xl pl-10 pr-4 py-2 text-xs outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowSmartMatchModal(true)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white text-xs font-black px-3 sm:px-4 py-2 rounded-2xl shadow-sm active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Room Match</span>
              <span className="sm:hidden">Room Match</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddRoomModal(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />{" "}
                <span className="hidden sm:inline">สร้างห้องใหม่</span>
              </button>
            )}

            {/* Quota สำหรับจอคอมพิวเตอร์ */}
            <div className="hidden lg:flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              โควตาคงเหลือ: {remainingQuota}/4 ชม.
            </div>

            {/* นาฬิกา Realtime สำหรับจอคอมพิวเตอร์ */}
            <div className="text-right hidden xl:block">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                REALTIME
              </span>
              <span className="text-xs font-black font-mono text-slate-800">
                {currentTime || "--:--:--"}
              </span>
            </div>

            {/* โปรไฟล์ผู้ใช้ + Logout สำหรับจอคอมพิวเตอร์ */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1 justify-end">
                  {userName}
                  {isAdmin && (
                    <span className="text-[9px] bg-orange-600 text-white font-bold px-1.5 py-0.2 rounded-md">
                      ADMIN
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {userEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="ออกจากระบบ"
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Banner */}
        <div className="rounded-3xl p-6 sm:p-8 text-white bg-gradient-to-r from-slate-950 via-slate-900 to-orange-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full">
                <Cpu className="w-3 h-3 text-orange-400" /> FIBO ROBOTICS & SMART INFRASTRUCTURE
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE DB
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Find Your Space at FIBO
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              ระบบจองห้องปฏิบัติการและห้องวิจัยอัจฉริยะ คณะวิทยาการหุ่นยนต์ (FIBO) ตรวจสอบสถานะแบบเรียลไทม์ และสแกน QR Code เพื่อเข้าใช้งานห้องได้ทันที
            </p>
          </div>

          <Link
            href="/schedule"
            className="bg-white hover:bg-orange-50 text-slate-900 hover:text-orange-600 font-bold text-xs px-5 py-3 rounded-2xl shadow-md transition-all shrink-0 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-orange-600" /> ตารางรวม (Timeline)
          </Link>
        </div>

        {/* 4 Cards Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="fibo-glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center shrink-0">
              <Layers className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{totalRoomsCount}</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">Total Rooms</p>
            </div>
          </div>

          <div className="fibo-glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
              <span className="w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600">{availableCount}</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">Available Now</p>
            </div>
          </div>

          <div className="fibo-glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
              <span className="w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-amber-600">{pendingCount}</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">Pending Check-in</p>
            </div>
          </div>

          <div className="fibo-glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
              <span className="w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-rose-500 animate-pulse" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-rose-600">{inUseCount}</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">Occupied (In Use)</p>
            </div>
          </div>
        </div>

        {/* 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Rooms List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {["All", "2", "3", "4", "5", "6"].map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setSelectedFloor(fl)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    selectedFloor === fl
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  {fl === "All" ? "All Floors" : `Floor ${fl}`}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {visibleRooms.map((room) => {
                const realtimeStatus = getRoomRealtimeStatus(room.id);
                const roomTodayBookings = allBookings.filter(
                  (b) =>
                    b.room_id === room.id &&
                    b.date === todayStr &&
                    (b.status === "pending" || b.status === "checked_in")
                );

                return (
                  <div
                    key={room.id}
                    className="fibo-glass-card rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-orange-300 transition-all duration-200 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                          LAB • FL {room.floor}
                        </span>
                        {renderBadge(realtimeStatus)}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                        {room.id}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-orange-500" />
                        {room.capacity} people • {room.type}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">คิวจองวันนี้</span>
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {roomTodayBookings.length > 0
                            ? `มี ${roomTodayBookings.length} ช่วงเวลา`
                            : "ว่างทุกช่วงเวลา"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenModal(room)}
                        className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" /> Quick Book
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Quota & Active Pass */}
          <div className="space-y-4">
            <div className="fibo-glass-card rounded-3xl p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" /> DAILY QUOTA
                </span>
                <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  ใช้ไป {usedHoursToday} / 4 hrs
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (usedHoursToday / 4) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                สิทธิ์การจองคงเหลือวันนี้{" "}
                <span className="font-black text-slate-800">{remainingQuota} ชั่วโมง</span>{" "}
                (รีเซ็ตทุกเที่ยงคืน และไม่คืนโควตาเมื่อกดคืนห้อง)
              </p>
            </div>

            <div className="fibo-glass-card rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700">
                  ACTIVE PASS (1 USER / 1 ROOM)
                </span>
                <Link
                  href="/my-booking"
                  className="text-[11px] font-bold text-orange-600 hover:underline"
                >
                  View all ({myActiveBookings.length})
                </Link>
              </div>

              {myActiveBookings.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    ยังไม่มีรายการจองที่กำลังใช้งานอยู่
                  </p>
                </div>
              ) : (
                myActiveBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-white/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-slate-900">
                        {b.room_id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          b.status === "checked_in"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {b.status === "checked_in" ? "In Room" : "Pending Check-In"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{b.title}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      วันที่: {b.date} | เวลา: {formatTimeShort(b.start_time)} –{" "}
                      {formatTimeShort(b.end_time)} ({b.duration_hours} ชม.)
                    </p>

                    {b.status === "pending" ? (
                      <Link
                        href="/check-in"
                        className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> ไปหน้าสแกน Check-In
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCheckOut(b)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        คืนห้อง (Check Out)
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal: AI Smart Match */}
      {showSmartMatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">FIBO Room Matcher</h3>
                  <p className="text-[11px] text-slate-500">แนะนำห้องที่ว่างและเหมาะสมที่สุดให้คุณทันที</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmartMatchModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>จำนวนผู้ใช้งาน</span>
                <span className="text-orange-600 font-black">{smartPeopleGroup} คน</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 8, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSmartPeopleGroup(cnt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      smartPeopleGroup === cnt
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {cnt} คน
                  </button>
                ))}
              </div>
            </div>

            {smartRoom ? (
              <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full">
                    BEST MATCH
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    ● ว่างพร้อมใช้
                  </span>
                </div>

                <div>
                  <h4 className="text-2xl font-black text-slate-900">{smartRoom.id}</h4>
                  <p className="text-xs text-slate-600">
                    ชั้น {smartRoom.floor} • รองรับ {smartRoom.capacity} คน ({smartRoom.type})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSmartMatchModal(false);
                    handleOpenModal(smartRoom);
                  }}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black flex items-center justify-center gap-1.5"
                >
                  เลือกจองห้อง {smartRoom.id} ทันที <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                ขณะนี้ไม่มีห้องว่างที่ตรงตามเงื่อนไข
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal จองห้อง */}
      {modalRoom && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  จองห้อง {modalRoom.id}
                </h3>
                <p className="text-xs text-slate-500">
                  ชั้น {modalRoom.floor} • รองรับ {modalRoom.capacity} คน ({modalRoom.type})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRoom(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                ช่วงเวลาที่มีผู้จองแล้วในวันที่ {formDate}:
              </p>
              {modalRoomBookingsOnDate.length === 0 ? (
                <p className="text-xs text-emerald-600 font-bold">
                  ✓ ยังไม่มีคิวจองในวันนี้ สามารถเลือกเวลาได้ทุกช่วง
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {modalRoomBookingsOnDate.map((b) => (
                    <span
                      key={b.id}
                      className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-xl border border-rose-200"
                    >
                      {formatTimeShort(b.start_time)} – {formatTimeShort(b.end_time)} น.
                    </span>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หัวข้อการใช้งาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ระบุวัตถุประสงค์ เช่น พัฒนาหุ่นยนต์, ประชุมโปรเจกต์..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันที่ต้องการใช้งาน (จองล่วงหน้าได้ไม่เกิน 1 วัน)
                </label>
                <input
                  type="date"
                  value={formDate}
                  min={todayStr}
                  max={tomorrowStr}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full max-w-full min-w-0 block appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
                />
              </div>

              {/* Time Picker */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    SET YOUR TIME
                  </span>
                  <p className="text-xs text-slate-500">เลือกช่วงเวลาเริ่มต้นและสิ้นสุดการใช้งานห้อง</p>
                </div>

                <div className="flex items-center justify-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => setActiveTimePicker("start")}
                    className={`text-center px-4 py-2 rounded-2xl transition-all ${
                      activeTimePicker === "start"
                        ? "bg-white shadow-md border-2 border-orange-500 scale-105"
                        : "bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Start</span>
                    <span className={`text-xl font-black ${activeTimePicker === "start" ? "text-orange-600" : "text-slate-800"}`}>
                      {formStart}
                    </span>
                  </button>

                  <span className="text-slate-400 text-base font-bold">→</span>

                  <button
                    type="button"
                    onClick={() => setActiveTimePicker("end")}
                    className={`text-center px-4 py-2 rounded-2xl transition-all ${
                      activeTimePicker === "end"
                        ? "bg-white shadow-md border-2 border-sky-500 scale-105"
                        : "bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">End</span>
                    <span className={`text-xl font-black ${activeTimePicker === "end" ? "text-sky-600" : "text-slate-800"}`}>
                      {formEnd}
                    </span>
                  </button>
                </div>

                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    ระยะเวลาใช้งาน: {getBookingDurationHours()} ชั่วโมง
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-black text-slate-400 border-b border-slate-100 pb-1.5 mb-1.5">
                    <span>HOURS</span>
                    <span>MINUTES</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 h-36">
                    <div className="overflow-y-auto space-y-1 pr-1">
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((hour) => {
                        const currentVal = activeTimePicker === "start" ? formStart : formEnd;
                        const [currH, currM] = currentVal.split(":");
                        const isSelected = currH === hour;

                        const isPastHour =
                          activeTimePicker === "start" &&
                          formDate === todayStr &&
                          Number(hour) < new Date().getHours();

                        return (
                          <button
                            key={hour}
                            type="button"
                            disabled={isPastHour}
                            onClick={() => {
                              const newTime = `${hour}:${currM}`;
                              if (activeTimePicker === "start") setFormStart(newTime);
                              else setFormEnd(newTime);
                            }}
                            className={`w-full py-1.5 text-xs font-bold rounded-lg transition-all ${
                              isPastHour
                                ? "text-slate-300 line-through cursor-not-allowed bg-slate-50"
                                : isSelected
                                ? activeTimePicker === "start"
                                  ? "bg-orange-500 text-white"
                                  : "bg-sky-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {hour}
                          </button>
                        );
                      })}
                    </div>

                    <div className="overflow-y-auto space-y-1 pr-1">
                      {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((minute) => {
                        const currentVal = activeTimePicker === "start" ? formStart : formEnd;
                        const [currH, currM] = currentVal.split(":");
                        const isSelected = currM === minute;
                        const slotTime = `${currH}:${minute}`;

                        const isTaken = activeTimePicker === "start" && isTimeSlotTaken(slotTime);
                        const isPast = activeTimePicker === "start" && isTimeInPast(slotTime);
                        const isDisabled = isTaken || isPast;

                        return (
                          <button
                            key={minute}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              const newTime = `${currH}:${minute}`;
                              if (activeTimePicker === "start") setFormStart(newTime);
                              else setFormEnd(newTime);
                            }}
                            className={`w-full py-1.5 text-xs font-bold rounded-lg transition-all ${
                              isDisabled
                                ? "text-slate-300 line-through cursor-not-allowed bg-slate-50"
                                : isSelected
                                ? activeTimePicker === "start"
                                  ? "bg-orange-500 text-white"
                                  : "bg-sky-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {minute} {isTaken ? "(จองแล้ว)" : isPast ? "(ผ่านมาแล้ว)" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนผู้เข้าใช้งาน (คน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={modalRoom.capacity}
                    value={formPeople}
                    onChange={(e) => setFormPeople(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อผู้จอง (ดึงจากบัญชีผู้ใช้)
                  </label>
                  <input
                    type="text"
                    value={formName}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalRoom(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-md"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal สร้างห้องใหม่ Admin */}
      {showAddRoomModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600">
                  ADMIN MANAGEMENT
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  เพิ่มห้องใหม่เข้าสู่ระบบ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoomModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสห้อง (เช่น FB405)
                </label>
                <input
                  type="text"
                  required
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  placeholder="FB..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold uppercase outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชั้น (Floor)
                  </label>
                  <select
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  >
                    {[2, 3, 4, 5, 6].map((fl) => (
                      <option key={fl} value={fl}>
                        ชั้น {fl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ความจุ (จำนวนคน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ประเภทห้อง
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="Lecture Room">Lecture Room</option>
                  <option value="Meeting Room">Meeting Room</option>
                  <option value="Lab / Workshop">Lab / Workshop</option>
                  <option value="Seminar Room">Seminar Room</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {isCreatingRoom ? "กำลังสร้าง..." : "บันทึกห้องใหม่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal แจ้งเตือนหมดเวลาใช้งาน */}
      {timeOutAlertBooking && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
                TIME'S UP • CHECK-OUT
              </span>
              <h3 className="text-xl font-black text-slate-900">
                หมดเวลาการใช้งานห้อง {timeOutAlertBooking.room_id}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                รอบการจองหัวข้อ <span className="font-bold text-slate-700">"{timeOutAlertBooking.title}"</span> สิ้นสุดลงแล้ว ระบบได้ทำการ Check-Out ให้อัตโนมัติเรียบร้อยแล้วครับ
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 text-[11px] text-slate-600 text-left space-y-1">
              <p>• กรุณาตรวจสอบสัมภาระส่วนตัว</p>
              <p>• ปิดเครื่องปรับอากาศและไฟก่อนออกจากห้อง</p>
              <p>• ส่งมอบห้องให้แก่ผู้เข้าใช้งานคิวถัดไป</p>
            </div>

            <button
              type="button"
              onClick={() => setTimeOutAlertBooking(null)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold transition-all"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}