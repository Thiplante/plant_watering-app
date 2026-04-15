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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      await loadPlants(session.user.id, session.user.email!);
    }
    init();
  }, [router]);

  const loadPlants = async (userId: string, userEmail: string) => {
    try {
      setLoading(true);
      const emailLower = userEmail.toLowerCase().trim();

      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .or(`owner_id.eq.${userId},id.in.(select plant_id from plant_shares where user_email.eq.${emailLower})`)
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F0FDF4] font-bold">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-black">
      <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm border-b border-green-100">
        <span className="text-xl font-black text-gray-800 tracking-tighter">🌱 PLANT CARE</span>
        <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-xs font-bold text-red-400 uppercase tracking-widest">Quitter</button>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-10 rounded-[40px] bg-white p-8 shadow-sm border border-green-100 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Ma Jungle 🌿</h1>
          </div>
          <Link href="/plants/new" className="rounded-2xl bg-green-600 px-8 py-4 font-bold text-white shadow-lg">+ Ajouter</Link>
        </div>

        {plants.length === 0 ? (
          <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-green-100 italic text-gray-400">
            Aucune plante trouvée.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plants.map((plant) => (
              <Link key={plant.id} href={`/plants/${plant.id}`} className="block rounded-[32px] bg-white p-6 shadow-sm border border-transparent hover:border-green-500 transition-all">
                <h3 className="text-2xl font-black mb-4 tracking-tighter">{plant.name}</h3>
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Prochain</p>
                  <p className="font-black text-green-900 text-lg">{getNextWateringDate(plant.last_watered_at, plant.watering_frequency_days)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}