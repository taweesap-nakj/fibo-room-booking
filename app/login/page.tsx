"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-[#EA580C] text-[11px] font-black">
            <Sparkles className="w-3.5 h-3.5" /> FIBO Smart Space Auth
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {mode === "login" ? "เข้าสู่ระบบ" : "ลงทะเบียนผู้ใช้งาน"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            ระบบจองห้องอาคารสถาบันวิทยาการหุ่นยนต์ภาคสนาม (FIBO)
          </p>
        </div>

        <button
          type="button"
          onClick={handleMicrosoftLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 hover:border-slate-300 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] text-xs font-bold text-slate-800 shadow-sm transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
          </svg>
          <span>เข้าสู่ระบบด้วย KMUTT Account (Microsoft)</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">
            หรือ
          </span>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
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
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            ลงทะเบียนใหม่
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form
          onSubmit={mode === "login" ? handleEmailLogin : handleRegister}
          className="space-y-3.5"
        >
          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                ชื่อ - นามสกุล
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="เช่น ทวีทรัพย์ นาคจีน"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              อีเมลสถาบัน หรือ อีเมลส่วนตัว
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name.sur@kmutt.ac.th"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-orange-700 hover:to-orange-800 text-white font-black text-xs py-3 rounded-xl shadow-md shadow-orange-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              "กำลังประมวลผล..."
            ) : mode === "login" ? (
              <>
                เข้าสู่ระบบ <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                ยืนยันการลงทะเบียน <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Role-Based Access Control (RBAC) System</span>
        </div>
      </div>
    </div>
  );
}