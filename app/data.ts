export interface Room {
  id: string;
  floor: number;
  capacity: number;
  type: string;
  status: "available" | "in_use" | "pending" | "unavailable";
  amenities: string[];
  nextAvailable: string;
  description: string;
}

export interface Booking {
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
  email: string;
  amenities: string[];
  status: "pending" | "confirmed" | "checked_in" | "completed" | "cancelled";
  checkedInAt?: string;
}

export const ROOMS_DATA: Room[] = [
  // ชั้น 2
  {
    id: "FB202",
    floor: 2,
    capacity: 50,
    type: "Lecture Room",
    status: "available",
    amenities: ["Projector", "Whiteboard", "Microphone"],
    nextAvailable: "Now",
    description: "ห้องเรียนบรรยายขนาดใหญ่ เหมาะสำหรับการสอนและสัมมนา",
  },
  // ชั้น 3
  {
    id: "FB303",
    floor: 3,
    capacity: 8,
    type: "Meeting Room",
    status: "in_use",
    amenities: ["TV", "Whiteboard"],
    nextAvailable: "Until 12:00 (1 h 36 min left)",
    description: "ห้องประชุมกลุ่มย่อย พร้อมจอทีวีและไวท์บอร์ด",
  },
  {
    id: "FB304",
    floor: 3,
    capacity: 10,
    type: "Meeting Room",
    status: "available",
    amenities: ["Projector", "Whiteboard", "TV"],
    nextAvailable: "Now",
    description: "ห้องประชุมขนาดกลาง เหมาะสำหรับพูดคุยงานกลุ่มและโครงงาน",
  },
  {
    id: "FB305",
    floor: 3,
    capacity: 12,
    type: "Meeting Room",
    status: "pending",
    amenities: ["Whiteboard", "Sound System"],
    nextAvailable: "Starts at 10:30 (Check-in within 6 min)",
    description: "ห้องประชุมพร้อมระบบเสียง เหมาะสำหรับการซ้อมนำเสนอ",
  },
  {
    id: "FB306",
    floor: 3,
    capacity: 6,
    type: "Study Room",
    status: "in_use",
    amenities: ["TV", "Computer"],
    nextAvailable: "Until 11:00 (36 min left)",
    description: "ห้องค้นคว้ากลุ่มย่อย พร้อมคอมพิวเตอร์ประจำห้อง",
  },
  {
    id: "FB307",
    floor: 3,
    capacity: 20,
    type: "Project Room",
    status: "available",
    amenities: ["Projector", "Video Conference"],
    nextAvailable: "Now",
    description: "ห้องทำโปรเจกต์และประชุมออนไลน์ทางไกล",
  },
  {
    id: "FB308",
    floor: 3,
    capacity: 8,
    type: "Study Room",
    status: "unavailable",
    amenities: ["Maintenance"],
    nextAvailable: "Not available",
    description: "ปิดปรับปรุงระบบไฟและเครื่องปรับอากาศชั่วคราว",
  },
  // ชั้น 4
  {
    id: "FB403",
    floor: 4,
    capacity: 30,
    type: "Lecture Room",
    status: "available",
    amenities: ["Projector", "Whiteboard"],
    nextAvailable: "Now",
    description: "ห้องเรียนรวมขนาดกลาง รองรับการเรียนการสอนและเวิร์กชอป",
  },
  {
    id: "FB404",
    floor: 4,
    capacity: 15,
    type: "Project Room",
    status: "in_use",
    amenities: ["TV", "Whiteboard", "Computer"],
    nextAvailable: "Until 13:00",
    description: "ห้องปฏิบัติการโปรเจกต์กลุ่มและระดมสมอง",
  },
  // ชั้น 5
  {
    id: "FB501",
    floor: 5,
    capacity: 10,
    type: "Meeting Room",
    status: "available",
    amenities: ["TV", "Whiteboard"],
    nextAvailable: "Now",
    description: "ห้องประชุมชั้น 5 บรรยากาศเงียบสงบ",
  },
  {
    id: "FB506",
    floor: 5,
    capacity: 25,
    type: "Lecture Room",
    status: "pending",
    amenities: ["Projector", "Sound System"],
    nextAvailable: "Starts at 10:30",
    description: "ห้องสัมมนาและบรรยายย่อย",
  },
  // ชั้น 6
  {
    id: "FB606",
    floor: 6,
    capacity: 8,
    type: "Study Room",
    status: "available",
    amenities: ["Whiteboard", "TV"],
    nextAvailable: "Now",
    description: "ห้องติวหนังสือและทำงานกลุ่มชั้น 6",
  },
  {
    id: "FB607",
    floor: 6,
    capacity: 12,
    type: "Project Room",
    status: "in_use",
    amenities: ["Projector", "Video Conference", "Whiteboard"],
    nextAvailable: "Until 14:00",
    description: "ห้องประชุมโปรเจกต์พร้อมอุปกรณ์ครบวงจร",
  },
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "BK20260914-001",
    room: "FB305",
    floor: 3,
    title: "Group project meeting",
    date: "Today",
    startTime: "10:30",
    endTime: "12:30",
    durationHours: 2,
    people: 6,
    bookedBy: "Tanawat Ch.",
    email: "tanawat@example.com",
    amenities: ["Whiteboard", "Sound System"],
    status: "pending",
  },
  {
    id: "BK20260910-098",
    room: "FB501",
    floor: 5,
    title: "Team discussion",
    date: "10 Sep 2026",
    startTime: "14:00",
    endTime: "16:00",
    durationHours: 2,
    people: 5,
    bookedBy: "Tanawat Ch.",
    email: "tanawat@example.com",
    amenities: ["TV", "Whiteboard"],
    status: "completed",
  },
];