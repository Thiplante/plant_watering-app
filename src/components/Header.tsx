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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-lg font-black tracking-tight text-[#163321] transition hover:text-[#28563c]"
            >
              Plant Care
            </Link>
            <nav className="hidden gap-2 sm:flex">
              <Link
                href="/"
                className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  pathname === "/"
                    ? "bg-[#edf4ee] text-[#183624]"
                    : "text-[#5e7061] hover:bg-white/80 hover:text-[#28563c]"
                }`}
              >
                Accueil
              </Link>
              <Link
                href="/plants/new"
                className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  pathname === "/plants/new"
                    ? "bg-[#edf4ee] text-[#183624]"
                    : "text-[#5e7061] hover:bg-white/80 hover:text-[#28563c]"
                }`}
              >
                Nouvelle plante
              </Link>
              <Link
                href="/settings"
                className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  pathname === "/settings"
                    ? "bg-[#edf4ee] text-[#183624]"
                    : "text-[#5e7061] hover:bg-white/80 hover:text-[#28563c]"
                }`}
              >
                Profil
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/plants/new" className="btn-primary hidden sm:inline-flex">
              Ajouter
            </Link>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn-secondary"
            >
              {loggingOut ? "Deconnexion..." : "Quitter"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2 sm:hidden">
          <Link
            href="/"
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-extrabold transition ${
              pathname === "/"
                ? "bg-[#edf4ee] text-[#183624]"
                : "text-[#5e7061] hover:bg-white/80 hover:text-[#28563c]"
            }`}
          >
            Accueil
          </Link>
          <Link
            href="/plants/new"
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-extrabold transition ${
              pathname === "/plants/new"
                ? "bg-[#edf4ee] text-[#183624]"
                : "text-[#5e7061] hover:bg-white/80 hover:text-[#28563c]"
            }`}
          >
            Ajouter
          </Link>
          <Link
            href="/settings"
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-extrabold transition ${
              pathname === "/settings"
                ? "bg-[#edf4ee] text-[#183624]"
                : "text-[#5e7061] hover:bg-white/80 hover:text-[#28563c]"
            }`}
          >
            Profil
          </Link>
        </div>
      </div>
    </header>
  );
}
