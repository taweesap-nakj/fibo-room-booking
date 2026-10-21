"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ROOMS_DATA, Room } from "../data";
import Link from "next/link";
import { Search, Tablet, ArrowLeft, Zap } from "lucide-react";

export default function SearchPage() {
  const [rooms, setRooms] = useState<Room[]>(ROOMS_DATA);
  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minCapacity, setMinCapacity] = useState(1);

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("id", { ascending: true });

      if (data && !error) {
        setRooms(
          data.map((r: any) => ({
            id: r.id,
            name: r.name || r.id.toUpperCase(),
            floor: Number(r.floor) || Number(String(r.id).replace(/\D/g, "")[0]) || 3,
            capacity: r.capacity || 8,
            type: r.type || "Meeting Room",
            status: r.status || "available",
            nextAvailable: r.next_available || "Now",
            description: r.description || "ห้องประชุมสำหรับการทำงานกลุ่มและโปรเจกต์",
            amenities: r.amenities || ["Whiteboard", "TV"],
          }))
        );
      }
    };

    fetchRooms();

    const channel = supabase
      .channel("search-rooms-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visibleRooms = rooms.filter((r) => {
    const matchFloor = floorFilter === "all" || r.floor === floorFilter;
    const matchSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.amenities.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCap = r.capacity >= minCapacity;
    return matchFloor && matchSearch && matchCap;
  });

  const renderBadge = (status: Room["status"]) => {
    const styles = {
      available: "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold",
      pending: "bg-amber-50 text-amber-700 border-amber-300 font-bold",
      in_use: "bg-rose-50 text-rose-700 border-rose-300 font-bold",
      unavailable: "bg-slate-100 text-slate-600 border-slate-300 font-bold",
    };
    const labels = {
      available: "Available",
      pending: "Pending",
      in_use: "In Use",
      unavailable: "Unavailable",
    };
    return (
      <span className={`text-xs border px-3 py-0.5 rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1550px] w-full mx-auto text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Find the Right Room</h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">ค้นหาห้องว่างตามความจุ ชั้น หรืออุปกรณ์ประจำห้องในตึก FIBO</p>
        </div>
        <Link
          href="/"
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> กลับหน้าแรก
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ตัวกรองด้านซ้าย */}
        <div className="lg:col-span-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="font-black text-sm text-slate-900">ตัวกรองห้อง</span>
            <button
              onClick={() => {
                setFloorFilter("all");
                setMinCapacity(1);
                setSearchQuery("");
              }}
              className="text-xs text-orange-600 font-bold hover:underline"
            >
              รีเซ็ตค่า
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold block text-slate-700">ค้นหาชื่อหรืออุปกรณ์</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="เช่น FB305, Projector..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700">ความจุขั้นต่ำ</span>
              <span className="text-orange-600 font-black">{minCapacity}+ คน</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={minCapacity}
              onChange={(e) => setMinCapacity(Number(e.target.value))}
              className="w-full accent-orange-600 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold block text-slate-700">เลือกชั้น</span>
            <div className="flex flex-wrap gap-1.5">
              {(["all", 2, 3, 4, 5, 6] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFloorFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    floorFilter === f
                      ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {f === "all" ? "ทั้งหมด" : `ชั้น ${f}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ผลลัพธ์รายการห้องด้านขวา */}
        <div className="lg:col-span-9 space-y-3">
          <p className="text-xs font-black text-slate-700">พบห้องที่ตรงเงื่อนไข {visibleRooms.length} ห้อง</p>
          {visibleRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-orange-300 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-black text-slate-900">{room.id}</h3>
                  {renderBadge(room.status)}
                </div>
                <p className="text-xs text-slate-700 font-bold">
                  ชั้น {room.floor} • {room.type} • รองรับ {room.capacity} คน
                </p>
                <p className="text-xs text-slate-600 font-medium">{room.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {room.amenities.map((item, i) => (
                    <span key={i} className="text-[11px] bg-slate-100 text-slate-800 font-semibold px-2.5 py-0.5 rounded-md border border-slate-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/kiosk?room=${room.id}`}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-orange-400 text-xs font-bold text-slate-700 hover:text-orange-600 flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Tablet className="w-4 h-4" /> จอหน้าห้อง
                </Link>
                {room.status === "available" ? (
                  <Link
                    href={`/?book=${room.id}`}
                    className="bg-[#EA580C] hover:bg-orange-700 active:scale-95 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5" /> Book Now
                  </Link>
                ) : (
                  <span className="text-xs font-black text-slate-500 px-2">{room.nextAvailable}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}