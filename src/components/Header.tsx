"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="app-header">
      <div className="app-header-shell">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-lg font-black tracking-tight text-[#163321] transition hover:text-[#28563c]"
            >
              Plant Watering
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn-secondary md:hidden"
            >
              {loggingOut ? "Deconnexion..." : "Quitter"}
            </button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <nav className="grid grid-cols-2 gap-2 sm:flex">
              <Link
                href="/"
                className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  pathname === "/"
                    ? "bg-[#edf4ee] text-[#183624]"
                    : "text-[#5e7061] hover:bg-white/80 hover:text-[#28563c]"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/plants/new"
                className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  pathname === "/plants/new"
                    ? "bg-[#edf4ee] text-[#183624]"
                    : "text-[#5e7061] hover:bg-white/80 hover:text-[#28563c]"
                }`}
              >
                Ajouter une plante
              </Link>
            </nav>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden md:inline-flex btn-secondary"
            >
              {loggingOut ? "Deconnexion..." : "Se deconnecter"}
            </button>
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <Link href="/plants/new" className="btn-primary w-full">
            Ajouter une plante rapidement
          </Link>
        </div>
      </div>
    </header>
  );
}
