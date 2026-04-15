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
    async function init() {
      // 1. On vérifie si l'utilisateur est connecté
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log("Pas de session, redirection...");
        router.push("/login");
        return;
      }

      // 2. Si on a une session, on charge les plantes
      await loadPlants(session.user.id);
    }
    init();
  }, [router]);

  const loadPlants = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlants(data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des plantes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleWaterPlant = async (e: React.MouseEvent, plantId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Évite d'ouvrir la page de détail
    
    const now = new Date().toISOString();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Mise à jour date principale
      await supabase.from("plants").update({ last_watered_at: now }).eq("id", plantId);
      // Ajout historique
      await supabase.from("watering_logs").insert({ 
        plant_id: plantId, 
        watered_at: now, 
        user_id: session.user.id 
      });
      loadPlants(session.user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4]">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">🌱</div>
          <p className="text-gray-500 font-bold">Récupération de tes plantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-black">
      <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="text-xl font-black text-gray-800 tracking-tight">Plant Watering</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 transition">
            Déconnexion
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-10 rounded-[32px] bg-white p-8 shadow-sm border border-green-100">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Bonjour ! 👋</h1>
          <p className="text-gray-500 mb-6">Voici l'état de ta jungle urbaine.</p>
          <Link
            href="/plants/new"
            className="inline-block rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 transition"
          >
            + Ajouter une plante
          </Link>
        </div>

        {plants.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-200">
            <p className="text-gray-400">Tu n'as pas encore de plantes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plants.map((plant) => (
              <Link 
                key={plant.id} 
                href={`/plants/${plant.id}`} 
                className="group block rounded-[32px] bg-white p-6 shadow-sm border border-transparent hover:border-green-500 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-black group-hover:text-green-600">{plant.name}</h3>
                  <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-lg italic">
                    {plant.watering_frequency_days}j
                  </span>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Dernier arrosage</p>
                  <p className="font-bold">
                    {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString() : "Jamais"}
                  </p>
                </div>

                <button 
                  onClick={(e) => handleWaterPlant(e, plant.id)}
                  className="w-full rounded-xl bg-black py-3 text-sm font-bold text-white hover:bg-green-600 transition"
                >
                  J'ai arrosé 💧
                </button>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}