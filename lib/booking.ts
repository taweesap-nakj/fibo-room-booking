import { supabase } from "./supabase";

export async function createBooking({
  roomId,
  title,
  startTime,
  endTime,
  attendees,
}: {
  roomId: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: number;
}) {
  // 1. ดึงข้อมูล User ที่กำลังล็อกอินอยู่จริง ณ ขณะนั้น
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการจอง");
  }

  // 2. คำนวณระยะเวลาใช้งาน
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationHours = Math.max(0.5, Number(((end - start) / (1000 * 60 * 60)).toFixed(1)));
  const bookingDate = startTime.split("T")[0];
  const startTimeStr = startTime.split("T")[1].substring(0, 5);
  const endTimeStr = endTime.split("T")[1].substring(0, 5);

  // 3. บันทึกข้อมูลโดยผูกกับ user.email และ user.id ของบัญชีนั้นโดยตรง
  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        room_id: roomId,
        title: title || "การใช้งานห้อง",
        date: bookingDate,
        start_time: startTimeStr,
        end_time: endTimeStr,
        duration_hours: durationHours,
        people: attendees,
        booked_by: user.user_metadata?.full_name || user.email?.split("@")[0] || "ผู้ใช้งาน",
        email: user.email,
        user_id: user.id,
        status: "pending",
      },
    ])
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}