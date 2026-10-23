"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Cpu,
  Activity,
  Globe,
  Eye,
  EyeOff,
  Sparkles,
  Bot,
  Terminal,
  Layers,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // ดักจับเมื่อผู้ใช้ล็อกอินสำเร็จ (โดยเฉพาะ Microsoft OAuth) ให้เด้งไปหน้าแรกทันที
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          router.replace("/");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // 1. ล็อกอินด้วย Microsoft KMUTT
  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email openid profile",
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "ไม่สามารถเชื่อมต่อ Microsoft KMUTT ได้");
      setLoading(false);
    }
  };

  // 2. ล็อกอินด้วยอีเมล & รหัสผ่าน
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      window.location.href = "/";
    } catch (err: any) {
      setErrorMsg(err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    }
  };

  // 3. ลงทะเบียนผู้ใช้งานใหม่
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim()) {
      setErrorMsg("กรุณากรอกชื่อ-นามสกุล");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          role: "user",
        });

        setSuccessMsg("ลงทะเบียนสำเร็จ! สามารถเข้าสู่ระบบได้ทันที");
        setMode("login");
        setPassword("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050814] text-slate-100 flex flex-col lg:flex-row relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
      
      {/* ---------------- BACKGROUND CYBER MATRIX & AMBIENT FLUX ---------------- */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Luminous Cyber Mesh Orbs */}
        <div className="absolute -top-32 -left-32 w-[38rem] h-[38rem] bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 right-0 w-[42rem] h-[42rem] bg-gradient-to-tl from-sky-500/20 via-blue-600/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-orange-600/10 rounded-full blur-[150px]" />

        {/* Visible Engineering CAD Grid */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* CAD Crosshairs Markers (+) ทุกๆ 160px */}
        <div 
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='160' height='160' viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M80 72v16M72 80h16' stroke='%2338bdf8' stroke-width='1.5' stroke-linecap='round'/%3E%3Ccircle cx='80' cy='80' r='3' fill='none' stroke='%23ea580c' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "160px 160px",
          }}
        />

        {/* Laser Radar Scanning Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/60 to-transparent animate-[radarScan_9s_ease-in-out_infinite_alternate]" />
      </div>

      {/* ---------------- LEFT SECTION: INTERACTIVE HOLOGRAPHIC STAGE (60%) ---------------- */}
      <section className="flex-1 lg:w-7/12 p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative z-10">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 p-1 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Cpu className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider text-white uppercase block">
                FIBO SMART BUILDING
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest block">
                KMUTT FIELD ROBOTICS LAB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              SYSTEM ACTIVE
            </span>
            <div className="hidden sm:block text-right bg-slate-900/60 border border-white/10 px-3 py-1 rounded-xl">
              <span className="text-xs font-mono font-bold text-slate-300 notranslate">
                {currentTime || "12:00:00"}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Hologram Stage + 3D Logo + Floating Dialogues */}
        <div className="my-8 lg:my-auto flex flex-col items-center justify-center relative">
          
          {/* Main Stage Ambient Flare */}
          <div className="absolute w-[28rem] h-[28rem] bg-radial from-orange-500/25 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Interactive Floating Chat Dialogues (แรงบันดาลใจจากภาพ Reference) */}
          <div className="w-full max-w-xl relative flex flex-col items-center">
            
            {/* Bubble 1: Top Left */}
            <div className="self-start mb-4 bg-slate-900/80 backdrop-blur-xl border border-sky-400/30 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 transform -rotate-1 hover:scale-105 transition-all">
              <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-black text-white">Hi, Engineering Student! 👋</p>
                <p className="text-[10px] text-slate-300">Welcome to FIBO Smart Space Reservation</p>
              </div>
            </div>

            {/* Bubble 2: Right Middle */}
            <div className="self-end mb-4 bg-slate-900/80 backdrop-blur-xl border border-orange-400/40 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 transform rotate-2 hover:scale-105 transition-all">
              <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-black text-orange-400">Live Space Allocation [FLOOR 2-6]</p>
                <p className="text-[10px] text-slate-300">เข้าถึงแล็บหุ่นยนต์, ห้องประชุม และ Lecture Rooms</p>
              </div>
            </div>

            {/* Center Orbital Gyro + Hologram FIBO Logo */}
            <div className="relative w-64 h-64 my-2 flex items-center justify-center group cursor-pointer">
              
              {/* Layer 1: Outermost Gyro Ring */}
              <div className="absolute inset-0 border border-dashed border-sky-400/30 rounded-full animate-[spin_35s_linear_infinite]" />
              
              {/* Layer 2: Middle Sensor Ring */}
              <div className="absolute inset-4 border-2 border-orange-500/30 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
              
              {/* Layer 3: Tech Bracket Ticks */}
              <div className="absolute inset-8 border border-white/20 rounded-full animate-[spin_12s_linear_infinite]" />

              {/* Glowing Laser Scan Bar over the logo */}
              <div className="absolute inset-10 bg-gradient-to-b from-transparent via-orange-500/25 to-transparent rounded-full animate-pulse" />

              {/* Central Floating Logo Shield */}
              <div className="w-36 h-36 rounded-3xl bg-slate-900/90 border-2 border-white/20 shadow-[0_0_50px_rgba(249,115,22,0.35)] p-4 flex items-center justify-center relative z-20 group-hover:scale-110 group-hover:border-orange-500 transition-all duration-300">
                <Image
                  src="/logo.svg"
                  alt="FIBO Logo"
                  width={110}
                  height={110}
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                  priority
                />
              </div>

              {/* Tech Corner Sensor Dots */}
              <span className="absolute top-2 left-10 w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span className="absolute bottom-4 right-12 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            </div>

            {/* Bubble 3: Bottom Center */}
            <div className="mt-4 bg-slate-900/90 backdrop-blur-xl border border-white/15 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 hover:scale-105 transition-all">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <p className="text-[11px] font-mono text-slate-300">
                <span className="text-emerald-400 font-bold">READY:</span> Sign in with KMUTT Account or credentials
              </p>
            </div>

          </div>

          {/* Slogan */}
          <div className="text-center mt-6 space-y-1">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              FIBO <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 bg-clip-text text-transparent">SMART SPACE</span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-400 tracking-widest font-mono">
              NEXT-GEN AUTONOMOUS ROOM RESERVATION
            </p>
          </div>

        </div>

        {/* Bottom Coordinates & Telemetry */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>13.6513° N, 100.4947° E • THONBURI</span>
          </div>
          <div className="flex items-center gap-3">
            <span>VERSION 4.2.0</span>
            <span className="text-orange-400 font-bold">KMUTT FIELD ROBOTICS</span>
          </div>
        </div>

      </section>

      {/* ---------------- RIGHT SECTION: LIQUID GLASS LOGIN CONSOLE (40%) ---------------- */}
      <section className="lg:w-5/12 p-4 sm:p-8 lg:p-12 flex items-center justify-center relative z-20 bg-slate-950/40 lg:bg-transparent backdrop-blur-xs lg:backdrop-blur-none border-t lg:border-t-0 lg:border-l border-white/10">
        
        {/* Crisp Frosted Glass Card */}
        <div className="w-full max-w-md bg-slate-900/75 backdrop-blur-3xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative space-y-5">
          
          {/* Card Top Edge Accent Bar */}
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

          {/* Title Header */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 font-mono bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
                AUTHENTICATION PORTAL
              </span>
              <Layers className="w-4 h-4 text-slate-500" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {mode === "login" ? "เข้าสู่ระบบ (Sign In)" : "ลงทะเบียนใหม่ (Register)"}
            </h2>
            <p className="text-xs text-slate-400">
              เข้าถึงระบบจองห้องแล็บและจัดการตารางการใช้งาน
            </p>
          </div>

          {/* Microsoft KMUTT Login Button */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.98] text-xs font-black text-slate-900 shadow-lg shadow-white/5 transition-all cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span>เข้าสู่ระบบด้วย KMUTT Account (Microsoft)</span>
          </button>

          {/* OR Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0f172a] border border-white/10 px-3 py-0.5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest absolute">
              หรือใช้อีเมล
            </span>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ลงทะเบียนใหม่
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login / Register Form */}
          <form
            onSubmit={mode === "login" ? handleEmailLogin : handleRegister}
            className="space-y-3.5"
          >
            {mode === "register" && (
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block font-mono">
                  ชื่อ - นามสกุล
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น ทวีทรัพย์ นาคจีน"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-orange-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block font-mono">
                อีเมลสถาบัน หรือ อีเมลทั่วไป
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name.sur@kmutt.ac.th"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-orange-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block font-mono">
                  รหัสผ่าน
                </label>
                <button
                  type="button"
                  onClick={() => alert("กรุณาติดต่อเจ้าหน้าที่ดูแลระบบ FIBO Smart Space เพื่อรีเซ็ตรหัสผ่าน")}
                  className="text-[10px] text-slate-400 hover:text-orange-400 transition-colors"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-orange-500 transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>
                  เข้าสู่ระบบ (SIGN IN) <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  ยืนยันการลงทะเบียน (REGISTER) <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer RBAC Security */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ROLE-BASED ACCESS CONTROL (RBAC) ACTIVE</span>
          </div>

        </div>

      </section>

    </div>
  );
}