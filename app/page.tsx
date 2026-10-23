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
  BookOpen,
  KeyRound,
  Bell,
  Users,
  Zap,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Plus,
  LogOut,
  Monitor,
  ShieldAlert,
} from "lucide-react";
// ตัวเลือกเวลาแบบ 24 ชั่วโมง ทุกๆ 5 นาที (00:00 - 23:55 น.)
const TIME_OPTIONS = Array.from({ length: 288 }, (_, i) => {
  const totalMinutes = i * 5;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

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

  // ข้อมูลผู้ใช้และสิทธิ์ Admin
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Modal จองห้อง
  const [modalRoom, setModalRoom] = useState<Room | null>(null);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(getLocalDateStr());
  const [formStart, setFormStart] = useState<string>("09:00");
  const [formEnd, setFormEnd] = useState<string>("10:00");
  const [formPeople, setFormPeople] = useState<number>(4);
  const [formName, setFormName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [timeOutAlertBooking, setTimeOutAlertBooking] = useState<any | null>(null);
  // Modal สร้างห้องใหม่ (เฉพาะ Admin)
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

      // ตรวจสอบสิทธิ์ Admin
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

      // 1. ดึงข้อมูลห้องทั้งหมด (ตัดห้อง SB- ที่ซ้ำออก)
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .order("id", { ascending: true });

      if (roomsData && roomsData.length > 0) {
        const cleanRooms = roomsData
          .filter((r: any) => !String(r.id).startsWith("SB-"))
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

      // 2. ดึงการจองทั้งหมดในระบบ (เพื่อคำนวณสถานะห้อง Real-time และเช็คเวลาชนกัน)
      const { data: allBookingsData } = await supabase
        .from("bookings")
        .select("*")
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (allBookingsData) {
        setAllBookings(allBookingsData);
        setMyBookings(allBookingsData.filter((b: any) => b.email === email));
        // ตรวจสอบว่ามีห้องของตนเองที่หมดเวลาใช้งานแล้วหรือไม่
        const myCompleted = allBookingsData.filter(
          (b: any) => b.email === email && b.status === "completed"
        );

        for (const b of myCompleted) {
          const notifiedKey = `notified_timeout_${b.id}`;
          // ถ้ายังไม่เคยแจ้งเตือนการจองรอบนี้ ให้แสดงป๊อปอัปแจ้งเตือน
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

    // นาฬิกา Real-time
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

    // Realtime Subscription เมื่อมีการจองหรือเปลี่ยนสถานะห้อง
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

  // คำนวณสถานะห้อง ณ เวลาปัจจุบันจริงๆ (Real-time Current Status)
  const getRoomRealtimeStatus = (roomId: string): "available" | "pending" | "in_use" => {
    const nowMs = Date.now();

    // เช็คว่ามีรายการที่เช็คอินแล้วและยังไม่หมดเวลาหรือไม่
    const checkedInBooking = allBookings.find((b) => {
      if (b.room_id !== roomId || b.status !== "checked_in") return false;
      const endMs = new Date(b.end_time).getTime();
      return isNaN(endMs) ? true : endMs > nowMs;
    });
    if (checkedInBooking) return "in_use";

    // เช็คว่ามีรายการที่รอเช็คอิน (ล่วงหน้าไม่เกิน 15 นาที หรืออยู่ในช่วงเวลาจอง)
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

  // นับจำนวนห้องแต่ละสถานะแบบ Real-time (แก้ข้อ 1)
  const totalRoomsCount = rooms.length;
  const inUseCount = rooms.filter((r) => getRoomRealtimeStatus(r.id) === "in_use").length;
  const pendingCount = rooms.filter((r) => getRoomRealtimeStatus(r.id) === "pending").length;
  const availableCount = totalRoomsCount - inUseCount - pendingCount;

  // คำนวณโควตาวันนี้ของผู้ใช้ (นับรวม completed เพื่อไม่ให้คืนโควตาเมื่อกดคืนห้อง - แก้ข้อ 6)
  const usedHoursToday = myBookings
    .filter((b) => b.date === todayStr && b.status !== "cancelled")
    .reduce((sum, b) => sum + (Number(b.duration_hours) || 0), 0);
  const remainingQuota = Math.max(0, Number((4 - usedHoursToday).toFixed(2)));

  // ค้นหารายการจองที่ยัง Active อยู่ของผู้ใช้ (จำกัด 1 คน ต่อ 1 รายการที่ค้างอยู่)
  const myActiveBookings = myBookings.filter((b) => {
    if (b.status !== "pending" && b.status !== "checked_in") return false;
    const endMs = new Date(b.end_time).getTime();
    return isNaN(endMs) ? true : endMs > Date.now();
  });

  // เปิด Modal จองห้อง
  const handleOpenModal = (room: Room) => {
    setModalRoom(room);
    setFormTitle(""); // ให้ผู้ใช้พิมพ์หัวข้อเอง
    setFormName(userName); // ดึงชื่อ User อัตโนมัติ
    setFormDate(todayStr);
    setFormPeople(Math.min(4, room.capacity));

    // ตั้งเวลาเริ่มต้นปัดขึ้นทุก 5 นาที
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

  // ตรวจสอบว่าเวลาใน Dropdown ชนกับการจองที่มีอยู่แล้วของห้องนี้หรือไม่
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

  // รายการจองของห้องที่เปิดอยู่ใน Modal เฉพาะวันที่เลือก
  const modalRoomBookingsOnDate = modalRoom
    ? allBookings.filter(
        (b) =>
          b.room_id === modalRoom.id &&
          b.date === formDate &&
          (b.status === "pending" || b.status === "checked_in")
      )
    : [];

  // ยืนยันการจอง
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRoom) return;

    if (!formTitle.trim()) {
      alert("กรุณากรอกหัวข้อการใช้งานห้อง");
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

  // กดคืนห้อง (Check Out) - เปลี่ยนสถานะเป็น completed โดยไม่คืนโควตาชั่วโมง
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

  // สร้างห้องใหม่ (เฉพาะ Admin - แก้ข้อ 4)
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> In Use
      </span>
    );
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
        กำลังตรวจสอบสิทธิ์การใช้งาน...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาห้อง เช่น FB201, Meeting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" /> สร้างห้องใหม่
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 bg-orange-50 border border-orange-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              โควตาคงเหลือ: {remainingQuota}/4 ชม.
            </div>

            <div className="text-right hidden md:block">
              <span className="text-[10px] text-slate-400 block">เวลาจริง (24H)</span>
              <span className="text-xs font-black font-mono text-slate-800">
                {currentTime || "--:--:--"}
              </span>
            </div>

            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1 justify-end">
                  {userName}
                  {isAdmin && (
                    <span className="text-[9px] bg-orange-600 text-white px-1.5 py-0.2 rounded-md">
                      ADMIN
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                title="ออกจากระบบ"
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-2">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full">
                FIBO SMART ROOM RESERVATION (LIVE SUPABASE DB)
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">Find Your Space at FIBO</h2>
              <p className="text-xs text-slate-200 max-w-xl">
                ระบบจองห้องเรียนและห้องประชุมอัจฉริยะ ตรวจสอบสถานะแบบเรียลไทม์ จองล่วงหน้าได้ 1 วัน และสแกน QR Code หน้าห้องเพื่อเช็คอิน
              </p>
            </div>
            <Link
              href="/schedule"
              className="bg-white text-slate-900 hover:bg-orange-50 font-bold text-xs px-5 py-3 rounded-2xl shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-orange-600" /> ตารางรวม (Timeline)
            </Link>
          </div>

          {/* 4 การ์ดสรุปสถานะห้องแบบ Real-time (แก้ข้อ 1) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center gap-4 shadow-2xs">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{totalRoomsCount}</p>
                <p className="text-xs text-slate-400 font-medium">Total Rooms</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center gap-4 shadow-2xs">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500"></span>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">{availableCount}</p>
                <p className="text-xs text-slate-400 font-medium">Available Now</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center gap-4 shadow-2xs">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500"></span>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-500">{pendingCount}</p>
                <p className="text-xs text-slate-400 font-medium">Pending</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center gap-4 shadow-2xs">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500"></span>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-600">{inUseCount}</p>
                <p className="text-xs text-slate-400 font-medium">In Use</p>
              </div>
            </div>
          </div>

          {/* เนื้อหาหลัก + แถบขวา */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ซ้าย: รายการห้อง */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {["All", "2", "3", "4", "5", "6"].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => setSelectedFloor(fl)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedFloor === fl
                        ? "bg-[#EA580C] text-white shadow-sm"
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
                      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-orange-300 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            FLOOR {room.floor}
                          </span>
                          {renderBadge(realtimeStatus)}
                        </div>
                        <h3 className="text-xl font-black text-slate-900">{room.id}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-orange-500" />
                          {room.capacity} people • {room.type}
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">คิวจองวันนี้</span>
                          <span className="font-bold text-slate-700">
                            {roomTodayBookings.length > 0
                              ? `มี ${roomTodayBookings.length} ช่วงเวลา`
                              : "ว่างทุกช่วงเวลา"}
                          </span>
                        </div>

                        {/* เปิดให้กดเลือกเวลาจองได้เสมอ (แก้ข้อ 8) */}
                        <button
                          onClick={() => handleOpenModal(room)}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white font-bold text-xs shadow-sm shadow-orange-600/15 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" /> Quick Book
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ขวา: โควตา และ Active Pass */}
            <div className="space-y-4">
              {/* โควตา (ไม่คืนเมื่อกด Check Out) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700">
                    DAILY QUOTA
                  </span>
                  <span className="text-xs font-black text-orange-600">
                    ใช้ไป {usedHoursToday} / 4 hrs
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EA580C] rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usedHoursToday / 4) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  สิทธิ์การจองคงเหลือวันนี้{" "}
                  <span className="font-bold text-slate-800">{remainingQuota} ชั่วโมง</span>{" "}
                  (รีเซ็ตทุกเที่ยงคืน และไม่คืนโควตาเมื่อกดคืนห้อง)
                </p>
              </div>

              {/* Active Pass */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-4 shadow-2xs">
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
                  <p className="text-xs text-slate-400 py-6 text-center">
                    ยังไม่มีรายการจองที่กำลังใช้งานอยู่
                  </p>
                ) : (
                  myActiveBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3"
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
                      <p className="text-[11px] text-slate-500">
                        วันที่: {b.date} | เวลา: {formatTimeShort(b.start_time)} –{" "}
                        {formatTimeShort(b.end_time)} ({b.duration_hours} ชม.)
                      </p>

                      {b.status === "pending" ? (
                        <Link
                          href="/check-in"
                          className="w-full py-2.5 px-4 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> ไปหน้าสแกน Check-In
                        </Link>
                      ) : (
                        <button
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
      

{/* Modal จองห้อง */}
      {modalRoom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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
                onClick={() => setModalRoom(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* แสดงคิวที่ถูกจองแล้วของห้องนี้ในวันที่เลือก */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
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
                      className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-lg border border-rose-200"
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
                  placeholder="ระบุวัตถุประสงค์ เช่น ประชุมโปรเจกต์, ติววิชา..."
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

              {/* ปรับเป็น 1 คอลัมน์บนมือถือ และ 2 คอลัมน์บนคอม */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เวลาเริ่มต้น (ทุก 5 นาที)
                  </label>
                  <select
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
                  >
                    {TIME_OPTIONS.map((t) => {
                      const taken = isTimeSlotTaken(t);
                      return (
                        <option key={t} value={t} disabled={taken}>
                          {t} {taken ? "(จองแล้ว)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เวลาสิ้นสุด (ข้ามวันได้ ไม่เกิน 4 ชม.)
                  </label>
                  <select
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ปรับเป็น 1 คอลัมน์บนมือถือ และ 2 คอลัมน์บนคอม */}
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
                  className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-orange-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-md shadow-orange-600/20"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal สร้างห้องใหม่สำหรับ Admin (แก้ข้อ 4) */}
      {showAddRoomModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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
    {/* วางโค้ด Modal แจ้งเตือนตรงนี้ */}
      {timeOutAlertBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
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
              onClick={() => setTimeOutAlertBooking(null)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}