import { supabase } from "@/lib/supabase";

export interface BookingPayload {
  roomId: string;
  title: string;
  startTime: string; // ISO String (มีทั้งวันและเวลา เช่น 2026-10-18T10:00:00.000Z)
  endTime: string;   // ISO String
  attendees: number;
}

export async function createBooking({
  roomId,
  title,
  startTime,
  endTime,
  attendees,
}: BookingPayload) {
  // 1. ตรวจสอบข้อมูลผู้ใช้
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการจอง");
  }

  // 2. ตรวจสอบเงื่อนไขวันและเวลา
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (end <= start) {
    throw new Error("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
  }

  // ป้องกันการจองย้อนหลังในอดีต (อนุญาตให้จองล่วงหน้าได้)
  if (start < new Date(now.getTime() - 5 * 60 * 1000)) {
    throw new Error("ไม่สามารถเลือกเวลาเริ่มต้นในอดีตได้");
  }

  // 3. ตรวจสอบ/สร้างข้อมูลโปรไฟล์ผู้ใช้
  let { data: profile, error: selectProfileError } = await supabase
    .from("profiles")
    .select("remaining_quota")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // ถ้ายังไม่มีแถวข้อมูล ให้สร้างใหม่
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        remaining_quota: 4,
      })
      .select("remaining_quota")
      .single();

    if (insertError) {
      console.error("Profile Upsert Error:", insertError);
      throw new Error(`ไม่สามารถสร้างโปรไฟล์ได้: ${insertError.message}`);
    }
    profile = newProfile;
  }

  if ((profile?.remaining_quota ?? 0) <= 0) {
    throw new Error("โควตาการจองของคุณหมดแล้ว");
  }

  // 4. ตรวจสอบการจองเวลาทับซ้อน (Overlap Check)
  // เช็คเฉพาะรายการที่ไม่ใช่ 'cancelled' หรือ 'expired'
  const { data: conflicts, error: conflictError } = await supabase
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .not("status", "in", '("cancelled","expired")')
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (conflictError) {
    throw new Error("เกิดข้อผิดพลาดในการตรวจสอบห้องว่าง");
  }

  if (conflicts && conflicts.length > 0) {
    throw new Error("ห้องนี้ถูกจองไปแล้วในช่วงเวลาดังกล่าว กรุณาเลือกช่วงเวลาอื่น");
  }

  // คำนวณเส้นตายเช็คอิน (ภายใน 15 นาทีหลังจากถึงเวลาเริ่มต้น)
  const checkInDeadline = new Date(start.getTime() + 15 * 60 * 1000).toISOString();

  // 5. บันทึกข้อมูลการจอง
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      room_id: roomId,
      user_id: user.id,
      title,
      start_time: startTime,
      end_time: endTime,
      attendees,
      status: "pending_checkin", // สถานะรอเช็คอินหน้าห้อง
      check_in_deadline: checkInDeadline,
    })
    .select()
    .single();

  if (bookingError) {
    throw new Error(bookingError.message || "ไม่สามารถบันทึกการจองได้");
  }

  // 6. หักโควตา
  await supabase
    .from("profiles")
    .update({ remaining_quota: profile.remaining_quota - 1 })
    .eq("id", user.id);

  return booking;
}