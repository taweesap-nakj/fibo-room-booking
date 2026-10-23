"use client";

import React, { useState } from "react";
import { Cpu, Sparkles, X } from "lucide-react";

export default function RoboticAmbience() {
  const [showTip, setShowTip] = useState(true);

  return (
    <>
      {/* 1. Ambient Dynamic Light Orbs เบื้องหลัง */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-400/15 rounded-full blur-3xl animate-ambient-slow" />
        <div 
          className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] bg-sky-400/15 rounded-full blur-3xl animate-ambient-slow" 
          style={{ animationDelay: "-6s" }} 
        />
        <div 
          className="absolute -bottom-24 left-1/3 w-80 h-80 bg-amber-300/10 rounded-full blur-3xl animate-ambient-slow" 
          style={{ animationDelay: "-3s" }} 
        />
      </div>

      {/* 2. FIBO Interactive Mini-Bot Companion (มุมขวาล่าง) */}
      <div className="fixed bottom-6 right-6 z-40 hidden sm:flex items-end gap-3 pointer-events-auto">
        {showTip && (
          <div className="liquid-glass rounded-2xl p-3 max-w-[210px] text-xs shadow-xl border border-white/80 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="flex items-center gap-1 font-black text-[10px] text-orange-600 uppercase tracking-wider">
                <Cpu className="w-3 h-3 text-orange-500" /> FIBO AI Bot
              </span>
              <button 
                onClick={() => setShowTip(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-600 text-[11px] leading-snug">
              ระบบจองห้องปฏิบัติการหุ่นยนต์ พร้อมเช็คอินผ่าน QR หน้าห้องแล้ว!
            </p>
          </div>
        )}

        {/* ตัวหุ่นยนต์ SVG สไตล์ Modern Tech พร้อมตามองเซนเซอร์ */}
        <div className="relative group cursor-pointer animate-robot-float">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-2.5 shadow-2xl border border-slate-700/60 flex items-center justify-center liquid-reflection">
            <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* เสาอากาศ */}
              <circle cx="24" cy="7" r="3" fill="#EA580C" />
              <line x1="24" y1="10" x2="24" y2="15" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
              {/* หัวหุ่นยนต์ */}
              <rect x="8" y="15" width="32" height="26" rx="8" fill="#1E293B" stroke="#475569" strokeWidth="2" />
              {/* หน้าจอ Visor */}
              <rect x="12" y="20" width="24" height="12" rx="4" fill="#0F172A" />
              {/* เซนเซอร์ตาเรืองแสงคู่ */}
              <circle cx="18" cy="26" r="3" fill="#38BDF8" className="animate-pulse" />
              <circle cx="30" cy="26" r="3" fill="#38BDF8" className="animate-pulse" />
              {/* รายละเอียดบอดี้หุ่นยนต์ */}
              <line x1="18" y1="36" x2="30" y2="36" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
      </div>
    </>
  );
}