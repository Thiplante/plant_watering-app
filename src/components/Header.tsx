"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (dark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setDark(!dark);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="p-6 flex justify-between items-center">
      <Link href="/" className="font-black text-xl">🌱 Plants</Link>

      <div className="flex gap-4">
        <button onClick={toggleTheme}>
          {dark ? "🌙" : "☀️"}
        </button>
        <button onClick={logout} className="text-sm">Logout</button>
      </div>
    </header>
  );
}