"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { refreshPlantWeather } from "@/lib/weather/actions";

export default function NewPlantPage() {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState(3);
  const [city, setCity] = useState("");
  const [exposure, setExposure] = useState("mi-ombre");
  const [canBeWateredByRain, setCanBeWateredByRain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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

    if (frequency <= 0) {
      alert("La fréquence doit être supérieure à 0.");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: newPlant, error } = await supabase
        .from("plants")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          watering_frequency_days: frequency,
          city: city.trim(),
          exposure,
          can_be_watered_by_rain: canBeWateredByRain,
          last_watered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!newPlant?.id) {
        throw new Error("La plante a été créée mais son identifiant est introuvable.");
      }

      try {
        await refreshPlantWeather(newPlant.id);
      } catch (weatherError) {
        console.error("Erreur météo après création :", weatherError);
      }

      router.push(`/plants/${newPlant.id}`);
      router.refresh();
    } catch (error: any) {
      alert("Erreur lors de la création : " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4]">
        <p className="animate-pulse font-black text-green-800">CHARGEMENT...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F0FDF4] p-6 sm:p-12">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="text-sm font-black text-green-700 transition-all hover:tracking-widest"
        >
          ← RETOUR À LA JUNGLE
        </Link>

        <div className="mt-8 rounded-[40px] border border-green-100 bg-white p-10 shadow-2xl">
          <h1 className="mb-8 text-4xl font-black italic tracking-tighter text-gray-900">
            Nouveau Bébé 🌿
          </h1>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Nom de la plante
              </label>
              <input
                type="text"
                placeholder="Mon Monstera..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-bold outline-none transition-all focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Ville (Météo)
                </label>
                <input
                  type="text"
                  placeholder="Bordeaux..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-bold outline-none transition-all focus:border-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Fréquence (jours)
                </label>
                <input
                  type="number"
                  min={1}
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-bold outline-none transition-all focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Exposition lumineuse
              </label>
              <select
                value={exposure}
                onChange={(e) => setExposure(e.target.value)}
                className="w-full appearance-none rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-bold outline-none transition-all focus:border-green-500"
              >
                <option value="soleil">Plein Soleil ☀️</option>
                <option value="mi-ombre">Mi-ombre 🌤️</option>
                <option value="ombre">Ombre ☁️</option>
              </select>
            </div>

            <div className="rounded-3xl border-2 border-blue-100 bg-blue-50 p-6">
              <label className="flex cursor-pointer items-center gap-4">
                <input
                  type="checkbox"
                  checked={canBeWateredByRain}
                  onChange={(e) => setCanBeWateredByRain(e.target.checked)}
                  className="h-6 w-6 rounded-lg border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase italic text-blue-900">
                    Arrosage par la pluie ?
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-400">
                    Active le suivi météo réel
                  </span>
                </div>
              </label>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full rounded-3xl bg-green-600 py-6 text-lg font-black uppercase tracking-widest text-white shadow-xl shadow-green-600/30 transition-all active:scale-95 hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "ENREGISTREMENT..." : "ENREGISTRER LA PLANTE"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}