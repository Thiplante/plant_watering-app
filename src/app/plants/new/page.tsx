"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NewPlantPage() {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState(3);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleCreate = async () => {
    if (!name.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase.from("plants").insert({
      owner_id: user.id,
      name: name.trim(),
      watering_frequency_days: frequency,
      last_watered_at: new Date().toISOString(), // Initialise la date à la création
    });

    if (error) {
      alert("Erreur lors de la création : " + error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6 sm:p-12">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm font-bold text-green-700 hover:underline">
          ← Retour à ma jungle
        </Link>
        <div className="mt-8 rounded-[40px] bg-white p-8 shadow-xl border border-green-100">
          <h1 className="text-3xl font-black text-gray-900 mb-6">Nouvelle Plante 🌿</h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Nom de la plante</label>
              <input
                type="text"
                placeholder="Mon beau Monstera..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 outline-none focus:ring-2 focus:ring-green-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Fréquence d'arrosage (jours)</label>
              <input
                type="number"
                min={1}
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 outline-none focus:ring-2 focus:ring-green-500 transition"
              />
            </div>

            <button
              onClick={handleCreate}
              className="w-full rounded-2xl bg-green-600 py-4 text-sm font-black text-white shadow-lg shadow-green-600/20 hover:bg-green-700 transition active:scale-95"
            >
              CRÉER DANS MA JUNGLE
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}