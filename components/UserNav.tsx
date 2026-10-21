"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LogOut, User as UserIcon } from "lucide-react";

export default function UserNav() {
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // ดึงชื่อเต็มจากตาราง profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        setUser({
          email: user.email,
          name: profile?.full_name || user.user_metadata?.full_name || user.email,
        });
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
        <UserIcon className="w-4 h-4" />
      </div>
      <div className="text-left">
        <p className="text-xs font-bold text-slate-800 line-clamp-1">{user.name}</p>
        <p className="text-[10px] text-slate-400 line-clamp-1">{user.email}</p>
      </div>
      <button
        onClick={handleLogout}
        title="ออกจากระบบ"
        className="ml-2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}