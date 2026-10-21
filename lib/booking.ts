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
  // 1. ตรวจสอบผู้ใช้งานที่กำลังล็อกอิน
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการจอง");
  }

  // 2. คำนวณเวลาเริ่มต้นและสิ้นสุด (รองรับการจองข้ามเที่ยงคืน)
  const startDateObj = new Date(startTime);
  let endDateObj = new Date(endTime);

  // หากเวลาสิ้นสุดน้อยกว่าหรือเท่ากับเวลาเริ่ม แปลว่าเป็นการจองข้ามเที่ยงคืน (บวกเพิ่ม 1 วัน)
  if (endDateObj.getTime() <= startDateObj.getTime()) {
    endDateObj = new Date(endDateObj.getTime() + 24 * 60 * 60 * 1000);
  }

  const startMs = startDateObj.getTime();
  const endMs = endDateObj.getTime();
  const durationHours = Number(((endMs - startMs) / (1000 * 60 * 60)).toFixed(2));

  if (durationHours <= 0) {
    throw new Error("ช่วงเวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
  }

  // กฎข้อ 9: จองได้ครั้งละไม่เกิน 4 ชั่วโมง
  if (durationHours > 4) {
    throw new Error("สามารถจองห้องได้สูงสุดครั้งละไม่เกิน 4 ชั่วโมง");
  }

  // กฎข้อ 9: ห้ามจองล่วงหน้าเกิน 1 วัน (ไม่เกินวันพรุ่งนี้)
  const now = new Date();
  const tomorrowEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    23,
    59,
    59
  ).getTime();

  if (startMs > tomorrowEnd) {
    throw new Error("สามารถจองล่วงหน้าได้ไม่เกิน 1 วันเท่านั้น");
  }

  // 3. ดึงรายการจองของผู้ใช้นี้ขึ้นมาตรวจสอบสิทธิ์และโควตา
  const { data: userBookings, error: userBookingsErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("email", user.email)
    .neq("status", "cancelled");

  if (userBookingsErr) {
    throw new Error("ไม่สามารถตรวจสอบสิทธิ์การจองได้: " + userBookingsErr.message);
  }

  // กฎข้อ 6 & 9: จำกัด 1 User ต่อ 1 ห้องที่กำลัง Active (pending หรือ checked_in)
  // หากจองล่วงหน้าไว้แล้ว หรือกำลังใช้งานห้องอยู่ จะไม่สามารถจองเพิ่มได้
  const activeUserBooking = (userBookings || []).find((b) => {
    if (b.status !== "pending" && b.status !== "checked_in") return false;
    const bEnd = new Date(b.end_time).getTime();
    return isNaN(bEnd) ? true : bEnd > now.getTime();
  });

  if (activeUserBooking) {
    throw new Error(
      `คุณมีรายการจองห้อง ${activeUserBooking.room_id} ค้างอยู่ในระบบแล้ว (จำกัดสิทธิ์ 1 ผู้ใช้งาน ต่อ 1 รายการจอง และหากจองล่วงหน้าแล้วจะไม่สามารถจองในวันเพิ่มได้)`
    );
  }

  // กฎข้อ 6: คำนวณโควตา 4 ชม./วัน (นับรวมรายการที่กดคืนห้อง completed ไปแล้วด้วย เพื่อไม่ให้คืนโควตา)
  const bookingDateStr = startTime.split("T")[0];
  const usedHoursOnDate = (userBookings || [])
    .filter((b) => b.date === bookingDateStr)
    .reduce((sum, b) => sum + (Number(b.duration_hours) || 0), 0);

  if (usedHoursOnDate + durationHours > 4) {
    const remaining = Math.max(0, Number((4 - usedHoursOnDate).toFixed(2)));
    throw new Error(
      `โควตาการจองของวันที่ ${bookingDateStr} ไม่เพียงพอ (คงเหลือ ${remaining} ชม. จาก 4 ชม./วัน และไม่มีการคืนโควตาเมื่อกดคืนห้อง รีเซ็ตทุกเที่ยงคืน)`
    );
  }

  // 4. กฎข้อ 7: ตรวจสอบการจองทับช่วงเวลากันของห้องนี้ (ป้องกันคนจองชนกัน)
  const { data: roomBookings, error: roomBookingsErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("room_id", roomId)
    .in("status", ["pending", "checked_in"]);

  if (roomBookingsErr) {
    throw new Error("ไม่สามารถตรวจสอบตารางห้องได้: " + roomBookingsErr.message);
  }

  const overlapping = (roomBookings || []).find((b) => {
    const existingStart = new Date(b.start_time).getTime();
    const existingEnd = new Date(b.end_time).getTime();
    if (isNaN(existingStart) || isNaN(existingEnd)) return false;
    // ช่วงเวลาทับซ้อนกันเมื่อ: เวลาเริ่มใหม่ < เวลาจบเดิม และ เวลาจบใหม่ > เวลาเริ่มเดิม
    return startMs < existingEnd && endMs > existingStart;
  });

  if (overlapping) {
    const oStart = new Date(overlapping.start_time).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const oEnd = new Date(overlapping.end_time).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    throw new Error(
      `ห้อง ${roomId} ถูกจองแล้วในช่วงเวลา ${oStart} – ${oEnd} น. กรุณาเลือกช่วงเวลาอื่น`
    );
  }

  // 5. บันทึกข้อมูลการจองลงฐานข้อมูล
  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        room_id: roomId,
        title: title.trim() || "การใช้งานห้อง",
        date: bookingDateStr,
        start_time: startDateObj.toISOString(),
        end_time: endDateObj.toISOString(),
        duration_hours: durationHours,
        people: attendees,
        booked_by:
          user.user_metadata?.full_name || user.email.split("@")[0] || "ผู้ใช้งาน",
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
// ฟังก์ชันตรวจสอบทั้ง Auto-Cancel (ไม่มาเช็คอินใน 15 นาที) และ Auto-Checkout (หมดเวลา)
export async function autoReleaseExpiredBookings() {
  try {
    const nowMs = Date.now();

    // ดึงเฉพาะรายการที่ยังค้างอยู่ในระบบ (pending และ checked_in)
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("*")
      .in("status", ["pending", "checked_in"]);

    if (!activeBookings || activeBookings.length === 0) return;

    for (const b of activeBookings) {
      // แปลง start_time และ end_time ให้เป็น Timestamp มิลลิวินาที
      let startMs = new Date(b.start_time).getTime();
      let endMs = new Date(b.end_time).getTime();

      // กรณีที่เวลาใน DB เก็บเป็นข้อความสั้น (HH:mm)
      if (isNaN(startMs) && b.date && b.start_time) {
        startMs = new Date(`${b.date}T${b.start_time}:00`).getTime();
      }
      if (isNaN(endMs) && b.date && b.end_time) {
        endMs = new Date(`${b.date}T${b.end_time}:00`).getTime();
      }

      if (isNaN(startMs) || isNaN(endMs)) continue;

      // 1. รอเช็คอิน (pending) แต่เลยเวลาเริ่มมาเกิน 15 นาที หรือเลยเวลาสิ้นสุดแล้ว -> ตัดเป็น cancelled
      if (b.status === "pending" && (nowMs > startMs + 15 * 60 * 1000 || nowMs >= endMs)) {
        await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
        await supabase.from("rooms").update({ status: "available", next_available: "Now" }).eq("id", b.room_id);
      }

      // 2. กำลังใช้งาน (checked_in) แต่เลยเวลาสิ้นสุดแล้ว -> ตัดเป็น completed
      if (b.status === "checked_in" && nowMs >= endMs) {
        await supabase.from("bookings").update({ status: "completed" }).eq("id", b.id);
        await supabase.from("rooms").update({ status: "available", next_available: "Now" }).eq("id", b.room_id);
      }
    }
  } catch (err) {
    console.error("Auto lifecycle error:", err);
  }
}