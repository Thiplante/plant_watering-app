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
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    // Récupérer mes plantes + les plantes partagées avec moi
    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setPlants(data || []);
    setLoading(false);
  };

  const handleQuickWater = async (e: React.MouseEvent, plant: any) => {
    e.preventDefault(); // Empêche d'ouvrir la page de détail
    const now = new Date().toISOString();
    const { data: { session } } = await supabase.auth.getSession();
    
    await supabase.from("plants").update({ last_watered_at: now }).eq("id", plant.id);
    await supabase.from("watering_logs").insert({ 
      plant_id: plant.id, 
      watered_at: now, 
      user_id: session?.user.id 
    });
    fetchPlants();
  };

  const calculateStatus = (lastDate: string, frequency: number) => {
    const last = new Date(lastDate);
    const next = new Date(lastDate);
    next.setDate(next.getDate() + frequency);
    const isOverdue = next < new Date();
    return {
      last: last.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      next: isOverdue ? "RETARD" : next.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      isOverdue
    };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F0FDF4] font-black italic">CHARGEMENT...</div>;

  return (
    <div className="min-h-screen bg-[#F0FDF4] p-6 lg:p-12 text-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12 bg-white p-10 rounded-[48px] shadow-sm">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase">Ma Jungle ☁️</h1>
          <Link href="/plants/new" className="bg-green-600 text-white px-10 py-5 rounded-3xl font-black shadow-lg hover:scale-105 transition">+ AJOUTER</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plants.map((plant) => {
            const status = calculateStatus(plant.last_watered_at, plant.watering_frequency_days);
            return (
              <div key={plant.id} className="group relative bg-white rounded-[44px] p-8 border-2 border-transparent hover:border-green-400 shadow-sm transition-all">
                <Link href={`/plants/${plant.id}`}>
                  <h3 className="text-3xl font-black tracking-tighter mb-4">{plant.name}</h3>
                  <div className="flex gap-2 mb-6 text-[10px] font-black uppercase text-gray-400">
                    <span className="bg-gray-50 px-3 py-1 rounded-lg">📍 {plant.city}</span>
                    <span className="bg-gray-50 px-3 py-1 rounded-lg">🔆 {plant.exposure}</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-2xl">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dernier</span>
                      <span className="text-sm font-bold text-gray-700">{status.last}</span>
                    </div>
                    <div className={`flex justify-between items-center px-4 py-3 rounded-2xl border ${status.isOverdue ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                      <span className={`text-[10px] font-black uppercase ${status.isOverdue ? 'text-red-400' : 'text-green-400'}`}>Prochain</span>
                      <span className={`text-sm font-black ${status.isOverdue ? 'text-red-600' : 'text-green-600'}`}>{status.next}</span>
                    </div>
                  </div>
                </Link>

                <button 
                  onClick={(e) => handleQuickWater(e, plant)}
                  className="w-full bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition"
                >
                  ARROSER 💧
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}