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
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push("/login");
        return;
      }
      await loadPlants(session.user.id, session.user.email!);
    }
    init();
  }, [router]);

  const loadPlants = async (userId: string, userEmail: string) => {
    try {
      // On récupère les plantes dont on est propriétaire OU celles partagées avec notre email
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .or(`owner_id.eq.${userId},id.in.(select plant_id from plant_shares where user_email.eq.${userEmail})`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlants(data || []);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  const getNextWateringDate = (lastDate: string, frequency: number) => {
    if (!lastDate) return "À faire !";
    const date = new Date(lastDate);
    date.setDate(date.getDate() + frequency);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4] font-bold italic">Chargement de ta jungle...</div>;

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-black">
      <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm border-b border-green-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="text-xl font-black text-gray-800 tracking-tight">Plant Watering</span>
        </div>
        <button onClick={handleLogout} className="text-sm font-bold text-gray-400 hover:text-red-500 transition">Déconnexion</button>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-10 rounded-[32px] bg-white p-8 shadow-sm border border-green-100 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">Mes Plantes 🌿</h1>
            <p className="text-gray-500 font-medium italic">Plantes personnelles et partagées.</p>
          </div>
          <Link href="/plants/new" className="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 transition shadow-lg shadow-green-100">
            + Ajouter
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <Link key={plant.id} href={`/plants/${plant.id}`} className="group block rounded-[32px] bg-white p-6 shadow-sm border border-transparent hover:border-green-500 transition-all">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black group-hover:text-green-600 tracking-tight">{plant.name}</h3>
                <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded-lg uppercase italic tracking-tighter">
                  {plant.watering_frequency_days}j
                </span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Prochain arrosage</p>
                  <p className="font-black text-green-800 text-lg">
                    {getNextWateringDate(plant.last_watered_at, plant.watering_frequency_days)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dernier arrosage</p>
                  <p className="font-bold text-gray-700">
                    {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString('fr-FR') : "Jamais"}
                  </p>
                </div>
              </div>

              <div className="text-center py-2 text-xs font-bold text-green-600 opacity-0 group-hover:opacity-100 transition">
                Voir les détails →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}