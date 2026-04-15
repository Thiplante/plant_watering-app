"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      loadPlants(session.user.id);
    };
    checkUser();
  }, [router]);

  const loadPlants = async (userId: string) => {
    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setPlants(data);
    setLoading(false);
  };

  const handleWaterPlant = async (e: React.MouseEvent, plantId: string) => {
    e.preventDefault(); // Empêche d'ouvrir la page de détail quand on clique sur le bouton
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("plants")
      .update({ last_watered_at: now })
      .eq("id", plantId);

    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) loadPlants(session.user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold">Chargement de tes plantes...</div>;

  return (
    <div className="min-h-screen bg-[#F0FDF4]">
      {/* Header */}
      <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="text-xl font-black text-gray-800 tracking-tight">Plant Watering</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-bold text-gray-600 hover:text-green-600">Accueil</Link>
          <Link href="/plants/new" className="text-sm font-bold text-gray-600 hover:text-green-600">Ajouter une plante</Link>
          <button onClick={handleLogout} className="rounded-xl bg-[#111827] px-6 py-2 text-sm font-bold text-white transition hover:bg-black">
            Déconnexion
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6 sm:p-10">
        {/* Banner */}
        <div className="relative mb-10 overflow-hidden rounded-[40px] border border-gray-100 bg-white p-8 shadow-sm sm:p-12">
          <div className="relative z-10 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-green-600 mb-2">Suivi d’arrosage</p>
            <h1 className="mb-4 text-5xl font-black text-gray-900">
              Mes plantes <span className="inline-block animate-bounce">🌱</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              Suis tes arrosages, vois les prochaines dates et partage tes plantes facilement.
            </p>
          </div>
          
          {/* BOUTON CORRIGÉ ICI (Ligne 136-138) */}
          <div className="mt-8">
            <Link
              href="/plants/new"
              className="inline-flex items-center justify-center rounded-2xl bg-[#00B341] px-8 py-4 text-base font-bold text-white transition hover:bg-green-600 shadow-lg shadow-green-200 active:scale-95"
            >
              + Ajouter une plante
            </Link>
          </div>
        </div>

        {/* Liste des plantes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <Link key={plant.id} href={`/plants/${plant.id}`} className="group relative overflow-hidden rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 group-hover:text-green-600 transition">{plant.name}</h3>
                  <p className="text-sm font-medium text-gray-400">Tous les {plant.watering_frequency_days} jours</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600 uppercase tracking-tighter">OK</span>
              </div>

              <div className="space-y-3 mb-8">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dernier arrosage</p>
                  <p className="font-bold text-gray-900">
                    {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString('fr-FR') : "Jamais"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prochain arrosage</p>
                  <p className="font-bold text-gray-900 text-green-600">À arroser</p>
                </div>
              </div>

              <button 
                onClick={(e) => handleWaterPlant(e, plant.id)}
                className="w-full rounded-2xl bg-[#111827] py-4 text-sm font-bold text-white transition hover:bg-black flex items-center justify-center gap-2"
              >
                J'ai arrosé 💧
              </button>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}