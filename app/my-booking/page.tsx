"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Users,
  AlertCircle,
  Building2,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Mail,
  User,
  Filter,
} from "lucide-react";

interface BookingItem {
  id: string;
  room_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  people: number;
  booked_by: string;
  email: string;
  status: string;
  created_at: string;
}

export default function BookingsManagementPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchBookingsData = async () => {
    try {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const email = session.user.email || "";
      setUserEmail(email);

      // ตรวจสอบสิทธิ์ Admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const admin =
        email === "admin@fibo.kmutt.ac.th" ||
        profile?.role === "admin" ||
        session.user.user_metadata?.role === "admin";
      setIsAdmin(admin);

      // ดึงข้อมูล: ถ้าเป็น Admin ดึงของทุกคน, ถ้าเป็น User ดึงเฉพาะของตัวเอง
      let query = supabase.from("bookings").select("*").order("start_time", { ascending: false });

      if (!admin) {
        query = query.eq("email", email);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        setBookings(data);
        setFilteredBookings(data);
      }
    } catch (err) {
      console.error("Fetch bookings error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingsData();
  }, [router]);

  // ตัวกรองสถานะ
  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter((b) => b.status === statusFilter));
    }
  }, [statusFilter, bookings]);

  // ฟังก์ชันยกเลิกการจอง
  const handleCancelBooking = async (booking: BookingItem) => {
    const confirmMsg = isAdmin
      ? `คุณต้องการยกเลิกการจองห้อง ${booking.room_id} ของคุณ ${booking.booked_by} (${booking.email}) ใช่หรือไม่?`
      : `คุณต้องการยกเลิกการจองห้อง ${booking.room_id} ใช่หรือไม่?`;

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(booking.id);
    try {
      // 1. อัปเดตสถานะการจองเป็น cancelled
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);

      if (bookingErr) throw bookingErr;

      // 2. ถ้าห้องนั้นติดสถานะ in_use หรือ pending ให้ปล่อยห้องว่าง
      await supabase
        .from("rooms")
        .update({ status: "available", next_available: "Now" })
        .eq("id", booking.room_id);

      // ดึงข้อมูลใหม่
      await fetchBookingsData();
    } catch (err: any) {
      alert("ไม่สามารถยกเลิกได้: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDisplayTime = (isoOrTime: string) => {
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> เช็คอินแล้ว (In Use)
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> รอเช็คอิน (Pending)
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            คืนห้องแล้ว (Completed)
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-500" /> ยกเลิกแล้ว (Cancelled)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  isAdmin
                    ? "bg-purple-100 text-purple-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {isAdmin ? "Admin Overview" : "Personal Bookings"}
              </span>
              {isAdmin && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> สิทธิ์ผู้ดูแลระบบ
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {isAdmin ? "All Bookings (รายการจองทั้งหมดในระบบ)" : "My Bookings (รายการจองของฉัน)"}
            </h1>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? "ตรวจสอบ จัดการ และควบคุมประวัติการใช้งานห้องของบุคลากรและนักศึกษาทุกคน"
                : `แสดงประวัติและรายการจองที่ผูกกับบัญชี ${userEmail}`}
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Filter className="w-4 h-4 text-orange-600" /> กรองตามสถานะ:
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "pending", label: "รอเช็คอิน" },
              { id: "checked_in", label: "กำลังใช้งาน" },
              { id: "completed", label: "คืนห้องแล้ว" },
              { id: "cancelled", label: "ยกเลิกแล้ว" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === f.id
                    ? "bg-[#EA580C] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* รายการจอง */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-xs font-bold text-slate-400 border border-slate-200/80">
            กำลังโหลดข้อมูลรายการจอง...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">ไม่พบรายการจองตามเงื่อนไขที่เลือก</p>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? "ยังไม่มีการจองในสถานะนี้ในระบบ"
                : "คุณยังไม่มีประวัติการจองห้องในสถานะนี้"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-orange-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xl font-black text-slate-900">{b.room_id}</span>
                    {renderStatusBadge(b.status)}
                    <span className="text-[11px] font-mono text-slate-400">
                      #{b.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-800">{b.title}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" /> วันที่: {b.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      {formatDisplayTime(b.start_time)} – {formatDisplayTime(b.end_time)} (
                      {b.duration_hours} ชม.)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-orange-500 shrink-0" /> {b.people} คน
                    </span>
                  </div>

                  {/* แสดงชื่อและอีเมลของผู้จอง (มีประโยชน์สำหรับ Admin มาก) */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <User className="w-3 h-3 text-slate-400" /> {b.booked_by || "ผู้ใช้งาน"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> {b.email}
                    </span>
                  </div>
                </div>

                {/* ปุ่มจัดการ */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                  {/* ปุ่มยกเลิกการจอง: User กดได้เฉพาะของตัวเองที่ยังไม่จบ ส่วน Admin ยกเลิกได้ทุกรายการที่ยังค้างอยู่ */}
                  {(b.status === "pending" || (isAdmin && b.status === "checked_in")) && (
                    <button
                      onClick={() => handleCancelBooking(b)}
                      disabled={actionLoadingId === b.id}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {actionLoadingId === b.id
                        ? "กำลังยกเลิก..."
                        : isAdmin
                        ? "ยกเลิกสิทธิ์ (Admin)"
                        : "ยกเลิกการจอง"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}