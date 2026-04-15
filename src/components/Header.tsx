"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-gray-900 hover:text-green-700">
            🌱 Plant Watering
          </Link>

          <nav className="hidden gap-4 sm:flex">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-green-700">
              Accueil
            </Link>
            <Link
              href="/plants/new"
              className="text-sm font-medium text-gray-600 hover:text-green-700"
            >
              Ajouter une plante
            </Link>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}