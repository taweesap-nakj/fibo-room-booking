"use client";

import { useState, useEffect, useRef } from "react";
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
  Bot,
  Sparkles,
  Cpu,
  Compass,
  ArrowRight,
} from "lucide-react";

// Component 3D Tilt Card สำหรับการ์ดห้องแบบ Liquid Glass
function TiltRoomCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // เอียง 3 มิติตามตำแหน่งเมาส์ สูงสุด 6 องศา
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    setTilt({
      x: rotateX,
      y: rotateY,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-5px)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)",
        transition: isHovered ? "transform 0.08s ease-out" : "transform 0.45s ease-out",
      }}
      className={`relative transform-gpu will-change-transform ${className}`}
    >
      {/* แสงเงากระจกสะท้อนตามปลายเมาส์ (Glare Specular) */}
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl z-20 opacity-35 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.9), transparent 60%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

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

  // Cyber Spotlight Mouse Position
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });

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
  const [activeTimePicker, setActiveTimePicker] = useState<"start" | "end">("start");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [timeOutAlertBooking, setTimeOutAlertBooking] = useState<any | null>(null);

  // Modal AI Smart Match (ฟีเจอร์ที่ 4)
  const [showSmartMatchModal, setShowSmartMatchModal] = useState<boolean>(false);
  const [smartPeopleGroup, setSmartPeopleGroup] = useState<number>(4);
  const [smartPurpose, setSmartPurpose] = useState<string>("Study / Project");

  // Modal สร้างห้องใหม่ (เฉพาะ Admin)
  const [showAddRoomModal, setShowAddRoomModal] = useState<boolean>(false);
  const [newRoomId, setNewRoomId] = useState<string>("");
  const [newRoomFloor, setNewRoomFloor] = useState<number>(2);
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(20);
  const [newRoomType, setNewRoomType] = useState<string>("Lecture Room");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);

  const todayStr = getLocalDateStr();
  const tomorrowStr = getLocalDateStr(new Date(Date.now() + 86400000));

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

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

      // 1. ดึงข้อมูลห้องทั้งหมด (กรองตัดทั้งห้อง SB- และ FIBO- ชุดเก่าออก)
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

      // 2. ดึงการจองทั้งหมดในระบบ
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

  // อัลกอริทึม Smart Match แนะนำห้องที่ดีที่สุดตามจำนวนคน
  const getSmartRecommendedRoom = () => {
    const availableRooms = rooms.filter((r) => getRoomRealtimeStatus(r.id) === "available");
    if (availableRooms.length === 0) return null;

    // หาห้องที่จุคนได้พอดีที่สุด (ไม่เลือกห้องใหญ่เกินจำเป็น)
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
          Available
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 border border-rose-500/20 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse"></span>
        In Use
      </span>
    );
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center text-xs font-bold text-slate-500">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-md">
          <Bot className="w-4 h-4 text-orange-500 animate-spin" />
          กำลังเชื่อมต่อระบบฐานข้อมูล FIBO...
        </div>
      </div>
    );
  }

  const smartRoom = getSmartRecommendedRoom();

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-transparent font-sans text-slate-900 relative">
      {/* Cyber Spotlight ติดตามเคอร์เซอร์เมาส์บน Grid */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 hidden md:block"
        style={{
          background: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, rgba(249, 115, 22, 0.06), rgba(14, 165, 233, 0.04), transparent 70%)`,
        }}
      />

      {/* Top Navbar */}
      <header className="bg-white/60 backdrop-blur-xl border-b border-white/80 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)]">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาห้อง เช่น FB201, Meeting..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/70 backdrop-blur-md border border-slate-200/70 focus:border-orange-500/70 focus:bg-white rounded-2xl pl-10 pr-4 py-2 text-xs outline-none transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* ปุ่ม AI Smart Match (ฟีเจอร์ที่ 4) */}
          <button
            onClick={() => setShowSmartMatchModal(true)}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black px-4 py-2 rounded-2xl shadow-md shadow-orange-500/25 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
            AI Smart Match
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAddRoomModal(true)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> สร้างห้องใหม่
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold text-orange-700 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
            โควตาคงเหลือ: {remainingQuota}/4 ชม.
          </div>

          <div className="text-right hidden md:block">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">REALTIME 24H</span>
            <span className="text-xs font-black font-mono text-slate-800 bg-white/60 px-2 py-0.5 rounded-md border border-white">
              {currentTime || "--:--:--"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200/70">
            <div className="text-right">
              <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1 justify-end">
                {userName}
                {isAdmin && (
                  <span className="text-[9px] bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold px-1.5 py-0.2 rounded-md shadow-2xs">
                    ADMIN
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="p-2 rounded-xl border border-slate-200/80 bg-white/60 text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 transition-all hover:scale-105"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6 max-w-7xl w-full mx-auto relative z-10">
        {/* Banner: Futuristic Glass Cyber Sheen */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 border border-white/10 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full backdrop-blur-md">
                <Cpu className="w-3 h-3 text-orange-400" /> FIBO ROBOTICS & SMART INFRASTRUCTURE
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE DB
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Find Your Space at FIBO
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              ระบบจองห้องปฏิบัติการและห้องวิจัยอัจฉริยะ คณะวิทยาการหุ่นยนต์ (FIBO) ตรวจสอบสถานะแบบเรียลไทม์ และสแกน QR Code เพื่อเข้าใช้งานห้องได้ทันที
            </p>
          </div>

          <Link
            href="/schedule"
            className="relative z-10 bg-white/95 hover:bg-white text-slate-900 hover:text-orange-600 font-bold text-xs px-5 py-3 rounded-2xl shadow-lg border border-white/60 transition-all duration-300 shrink-0 flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            <Calendar className="w-4 h-4 text-orange-600" /> ตารางรวม (Timeline)
          </Link>
        </div>

        {/* 4 Cards: Liquid Glass Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/65 backdrop-blur-xl rounded-3xl p-5 border border-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(249,115,22,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/15 to-orange-600/5 text-orange-600 border border-orange-500/20 flex items-center justify-center shadow-xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{totalRoomsCount}</p>
              <p className="text-xs text-slate-500 font-semibold">Total Rooms</p>
            </div>
          </div>

          <div className="bg-white/65 backdrop-blur-xl rounded-3xl p-5 border border-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(16,185,129,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600 tracking-tight">{availableCount}</p>
              <p className="text-xs text-slate-500 font-semibold">Available Now</p>
            </div>
          </div>

          <div className="bg-white/65 backdrop-blur-xl rounded-3xl p-5 border border-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(245,158,11,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 text-amber-600 border border-amber-500/20 flex items-center justify-center shadow-xs">
              <span className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600 tracking-tight">{pendingCount}</p>
              <p className="text-xs text-slate-500 font-semibold">Pending Check-in</p>
            </div>
          </div>

          <div className="bg-white/65 backdrop-blur-xl rounded-3xl p-5 border border-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(244,63,94,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/15 to-rose-600/5 text-rose-600 border border-rose-500/20 flex items-center justify-center shadow-xs">
              <span className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-black text-rose-600 tracking-tight">{inUseCount}</p>
              <p className="text-xs text-slate-500 font-semibold">Occupied (In Use)</p>
            </div>
          </div>
        </div>

        {/* 2 Columns Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left: Rooms List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Floor Selection */}
            <div className="flex flex-wrap items-center gap-2">
              {["All", "2", "3", "4", "5", "6"].map((fl) => (
                <button
                  key={fl}
                  onClick={() => setSelectedFloor(fl)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 ${
                    selectedFloor === fl
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25 scale-105 border border-orange-400"
                      : "bg-white/65 backdrop-blur-md text-slate-600 border border-white/80 hover:bg-white hover:border-orange-200"
                  }`}
                >
                  {fl === "All" ? "All Floors" : `Floor ${fl}`}
                </button>
              ))}
            </div>

            {/* Room Cards: 3D Tilt + Holographic Glass Card (ลูกเล่นที่ 1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {visibleRooms.map((room) => {
                const realtimeStatus = getRoomRealtimeStatus(room.id);
                const isRoomAvailable = realtimeStatus === "available";
                const roomTodayBookings = allBookings.filter(
                  (b) =>
                    b.room_id === room.id &&
                    b.date === todayStr &&
                    (b.status === "pending" || b.status === "checked_in")
                );

                return (
                  <TiltRoomCard
                    key={room.id}
                    className={`bg-white/70 backdrop-blur-xl rounded-3xl p-5 border border-white/90 shadow-[0_8px_32px_0_rgba(15,23,42,0.05)] flex flex-col justify-between space-y-4 group overflow-hidden ${
                      isRoomAvailable ? "holo-card-available" : ""
                    }`}
                  >
                    <div className="space-y-2 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                          LAB • FL {room.floor}
                        </span>
                        {renderBadge(realtimeStatus)}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-orange-600 transition-colors">
                        {room.id}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-orange-500" />
                        {room.capacity} people • {room.type}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-200/50 relative z-10">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">คิวจองวันนี้</span>
                        <span className="font-bold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-lg border border-slate-200/50">
                          {roomTodayBookings.length > 0
                            ? `มี ${roomTodayBookings.length} ช่วงเวลา`
                            : "ว่างทุกช่วงเวลา"}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenModal(room)}
                        className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" /> Quick Book
                      </button>
                    </div>
                  </TiltRoomCard>
                );
              })}
            </div>
          </div>

          {/* Right Column: Quota & Active Pass */}
          <div className="space-y-4">
            {/* Daily Quota Card */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 border border-white/90 space-y-3.5 shadow-[0_8px_32px_0_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" /> DAILY QUOTA
                </span>
                <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  ใช้ไป {usedHoursToday} / 4 hrs
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100/90 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${Math.min(100, (usedHoursToday / 4) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                สิทธิ์การจองคงเหลือวันนี้{" "}
                <span className="font-black text-slate-800">{remainingQuota} ชั่วโมง</span>{" "}
                (รีเซ็ตทุกเที่ยงคืน และไม่คืนโควตาเมื่อกดคืนห้อง)
              </p>
            </div>

            {/* Active Pass Card */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 border border-white/90 space-y-4 shadow-[0_8px_32px_0_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  ACTIVE PASS (1 USER / 1 ROOM)
                </span>
                <Link
                  href="/my-booking"
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  View all ({myActiveBookings.length})
                </Link>
              </div>

              {myActiveBookings.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100/80 text-slate-400 flex items-center justify-center mx-auto">
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
                    className="p-4 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-slate-900 tracking-tight">
                        {b.room_id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          b.status === "checked_in"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
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
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> ไปหน้าสแกน Check-In
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleCheckOut(b)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
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

      {/* Modal: AI Smart Match Room (ลูกเล่นที่ 4) */}
      {showSmartMatchModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-white/90">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">FIBO AI Room Matcher</h3>
                  <p className="text-[11px] text-slate-500">แนะนำห้องที่ว่างและเหมาะสมที่สุดให้คุณทันที</p>
                </div>
              </div>
              <button
                onClick={() => setShowSmartMatchModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* เลือกจำนวนคน */}
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
                        ? "bg-orange-500 text-white border-orange-500 shadow-xs scale-105"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                    }`}
                  >
                    {cnt} คน
                  </button>
                ))}
              </div>
            </div>

            {/* การ์ดผลลัพธ์ห้องที่ AI แนะนำ */}
            {smartRoom ? (
              <div className="bg-gradient-to-br from-orange-50/80 via-white to-amber-50/80 border border-orange-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100/80 px-2.5 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> BEST MATCH
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ว่างพร้อมใช้
                  </span>
                </div>

                <div>
                  <h4 className="text-2xl font-black text-slate-900">{smartRoom.id}</h4>
                  <p className="text-xs text-slate-600">
                    ชั้น {smartRoom.floor} • รองรับ {smartRoom.capacity} คน ({smartRoom.type})
                  </p>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 bg-white/70 rounded-xl p-2.5 border border-orange-100 font-medium">
                  <p className="text-emerald-700 font-bold">✓ ขนาดห้องพอดีกับ {smartPeopleGroup} คน ไม่เปลืองพลังงาน</p>
                  <p>✓ สถานะปัจจุบันว่าง พร้อมใช้งานได้ทันที</p>
                </div>

                <button
                  onClick={() => {
                    setShowSmartMatchModal(false);
                    handleOpenModal(smartRoom);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-black shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  เลือกจองห้อง {smartRoom.id} ทันที <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                ขณะนี้ไม่มีห้องว่างที่ตรงตามเงื่อนไข กรุณาลองเลือกจำนวนคนใหม่
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal จองห้อง */}
      {modalRoom && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-white/90 max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-start justify-between border-b border-slate-200/60 pb-3">
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
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* แสดงคิวที่ถูกจองแล้ว */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
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
                  className="w-full bg-white/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-orange-500 focus:bg-white transition-all"
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
                  className="w-full max-w-full min-w-0 block appearance-none bg-white/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>

              {/* Modern Time Picker Component */}
              <div className="space-y-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    SET YOUR TIME
                  </span>
                  <p className="text-xs text-slate-500">เลือกช่วงเวลาเริ่มต้นและสิ้นสุดการใช้งานห้อง</p>
                </div>

                {/* แถบแสดงเวลา Start -> End */}
                <div className="flex items-center justify-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => setActiveTimePicker("start")}
                    className={`text-center px-4 py-2 rounded-2xl transition-all ${
                      activeTimePicker === "start"
                        ? "bg-white shadow-md border-2 border-orange-500 scale-105"
                        : "bg-slate-100/80 border border-slate-200 hover:bg-white"
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
                        : "bg-slate-100/80 border border-slate-200 hover:bg-white"
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">End</span>
                    <span className={`text-xl font-black ${activeTimePicker === "end" ? "text-sky-600" : "text-slate-800"}`}>
                      {formEnd}
                    </span>
                  </button>
                </div>

                {/* ป้ายคำนวณระยะเวลาจองรอบนี้ */}
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100/80 text-orange-800 border border-orange-200">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    ระยะเวลาใช้งาน: {getBookingDurationHours()} ชั่วโมง
                  </span>
                </div>

                {/* คอลัมน์เลื่อนเลือก ชั่วโมง (HH) และ นาที (MM) */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-inner">
                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-black text-slate-400 border-b border-slate-100 pb-1.5 mb-1.5">
                    <span>HOURS</span>
                    <span>MINUTES</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 h-36">
                    {/* คอลัมน์ชั่วโมง 00 - 23 */}
                    <div className="overflow-y-auto space-y-1 pr-1 scrollbar-thin">
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
                                ? "text-slate-300 line-through cursor-not-allowed bg-slate-50/50"
                                : isSelected
                                ? activeTimePicker === "start"
                                  ? "bg-orange-500 text-white shadow-sm"
                                  : "bg-sky-500 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {hour}
                          </button>
                        );
                      })}
                    </div>

                    {/* คอลัมน์นาที 00 - 55 */}
                    <div className="overflow-y-auto space-y-1 pr-1 scrollbar-thin">
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
                                ? "text-slate-300 line-through cursor-not-allowed bg-slate-50/50"
                                : isSelected
                                ? activeTimePicker === "start"
                                  ? "bg-orange-500 text-white shadow-sm"
                                  : "bg-sky-500 text-white shadow-sm"
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

              {/* ผู้เข้าใช้งาน และ ชื่อผู้จอง */}
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
                    className="w-full bg-white/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-orange-500 transition-all"
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
                    className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setModalRoom(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-95 transition-all"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal สร้างห้องใหม่สำหรับ Admin */}
      {showAddRoomModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-white/90">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
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
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
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
                  className="w-full bg-white/70 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold uppercase outline-none focus:border-emerald-500 transition-all"
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
                    className="w-full bg-white/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
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
                    className="w-full bg-white/70 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none"
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
                  className="w-full bg-white/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="Lecture Room">Lecture Room</option>
                  <option value="Meeting Room">Meeting Room</option>
                  <option value="Lab / Workshop">Lab / Workshop</option>
                  <option value="Seminar Room">Seminar Room</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-white/90">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Clock className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                TIME'S UP • CHECK-OUT
              </span>
              <h3 className="text-xl font-black text-slate-900">
                หมดเวลาการใช้งานห้อง {timeOutAlertBooking.room_id}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                รอบการจองหัวข้อ <span className="font-bold text-slate-700">"{timeOutAlertBooking.title}"</span> สิ้นสุดลงแล้ว ระบบได้ทำการ Check-Out ให้อัตโนมัติเรียบร้อยแล้วครับ
              </p>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-3 text-[11px] text-slate-600 text-left space-y-1 border border-slate-100">
              <p>• กรุณาตรวจสอบสัมภาระส่วนตัว</p>
              <p>• ปิดเครื่องปรับอากาศและไฟก่อนออกจากห้อง</p>
              <p>• ส่งมอบห้องให้แก่ผู้เข้าใช้งานคิวถัดไป</p>
            </div>

            <button
              onClick={() => setTimeOutAlertBooking(null)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}