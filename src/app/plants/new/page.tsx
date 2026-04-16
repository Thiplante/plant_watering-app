"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NewPlantPage() {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState(3);
  const [city, setCity] = useState("");
  const [exposure, setExposure] = useState("mi-ombre");
  const [canBeWateredByRain, setCanBeWateredByRain] = useState(false);
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
    if (!name.trim() || !city.trim()) {
      alert("Le nom et la ville sont obligatoires pour le suivi météo.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("plants").insert({
      owner_id: user.id,
      name: name.trim(),
      watering_frequency_days: frequency,
      city: city.trim(),
      exposure: exposure,
      can_be_watered_by_rain: canBeWateredByRain,
      last_watered_at: new Date().toISOString(),
    });

    if (error) {
      alert("Erreur lors de la création : " + error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4]">
      <p className="font-black text-green-800 animate-pulse">CHARGEMENT...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F0FDF4] p-6 sm:p-12">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm font-black text-green-700 hover:tracking-widest transition-all">
          ← RETOUR À LA JUNGLE
        </Link>
        
        <div className="mt-8 rounded-[40px] bg-white p-10 shadow-2xl border border-green-100">
          <h1 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter italic">Nouveau Bébé 🌿</h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Nom de la plante</label>
              <input
                type="text"
                placeholder="Mon Monstera..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl bg-gray-50 border-2 border-transparent px-6 py-4 outline-none focus:border-green-500 transition-all font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Ville (Météo)</label>
                <input
                  type="text"
                  placeholder="Bordeaux..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 border-2 border-transparent px-6 py-4 outline-none focus:border-green-500 transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Fréquence (jours)</label>
                <input
                  type="number"
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="w-full rounded-2xl bg-gray-50 border-2 border-transparent px-6 py-4 outline-none focus:border-green-500 transition-all font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Exposition lumineuse</label>
              <select 
                value={exposure}
                onChange={(e) => setExposure(e.target.value)}
                className="w-full rounded-2xl bg-gray-50 border-2 border-transparent px-6 py-4 outline-none focus:border-green-500 transition-all font-bold appearance-none"
              >
                <option value="soleil">Plein Soleil ☀️</option>
                <option value="mi-ombre">Mi-ombre 🌤️</option>
                <option value="ombre">Ombre ☁️</option>
              </select>
            </div>

            <div className="p-6 rounded-3xl bg-blue-50 border-2 border-blue-100">
              <label className="flex items-center gap-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={canBeWateredByRain} 
                  onChange={(e) => setCanBeWateredByRain(e.target.checked)}
                  className="w-6 h-6 rounded-lg border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-black text-blue-900 uppercase italic">Arrosage par la pluie ?</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Active le suivi météo réel</span>
                </div>
              </label>
            </div>

            <button
              onClick={handleCreate}
              className="w-full rounded-3xl bg-green-600 py-6 text-lg font-black text-white shadow-xl shadow-green-600/30 hover:bg-green-700 transition-all active:scale-95 uppercase tracking-widest"
            >
              ENREGISTRER LA PLANTE
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}