"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      await fetchPlants();
    };
    init();
  }, [router]);

  const fetchPlants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPlants(data || []);
    } catch (err) {
      console.error("Erreur de récupération:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateWateringStatus = (lastDate: string, frequency: number) => {
    const last = new Date(lastDate);
    if (!lastDate) return { 
      text: "À arroser !", 
      color: "text-red-600", 
      bg: "bg-red-50", 
      lastText: "Jamais" 
    };

    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + frequency);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isOverdue = nextDate < today;

    return {
      text: isOverdue ? `En retard` : nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      color: isOverdue ? "text-red-600" : "text-green-600",
      bg: isOverdue ? "bg-red-50" : "bg-green-50",
      lastText: last.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    };
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4]">
      <div className="text-5xl animate-bounce">🌿</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-black">
      <nav className="sticky top-0 z-50 flex items-center justify-between bg-white/90 backdrop-blur-lg px-8 py-5 shadow-sm border-b border-green-100">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌱</span>
          <span className="text-xl font-black text-gray-800 uppercase tracking-tighter">Plant Care AI</span>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="bg-red-50 text-red-500 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
        >
          Quitter
        </button>
      </nav>

      <main className="mx-auto max-w-7xl p-6 lg:p-12">
        <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-8 rounded-[48px] bg-white p-12 shadow-2xl border border-green-50">
          <div>
            <h1 className="text-6xl font-black text-gray-900 mb-2 tracking-tighter italic">Ma Jungle Connectée ☁️</h1>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.3em]">Météo temps-réel activée</p>
          </div>
          <Link 
            href="/plants/new" 
            className="bg-green-600 px-12 py-6 rounded-3xl font-black text-white shadow-xl hover:-translate-y-1 transition-all active:scale-95"
          >
            + AJOUTER
          </Link>
        </div>

        {plants.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[48px] border-4 border-dashed border-green-100">
            <p className="text-2xl font-black text-gray-300 italic">C'est le désert...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {plants.map((plant) => {
              const status = calculateWateringStatus(plant.last_watered_at, plant.watering_frequency_days);
              return (
                <Link 
                  key={plant.id} 
                  href={`/plants/${plant.id}`} 
                  className="group relative bg-white rounded-[44px] p-10 shadow-sm border-2 border-transparent hover:border-green-400 hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-3xl font-black text-gray-800 tracking-tighter group-hover:text-green-600 transition-colors">{plant.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">📍 {plant.city}</span>
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">• {plant.exposure}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloc DERNIER ARROSAGE */}
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 mb-3 flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-gray-400">Dernier soin</p>
                    <p className="text-sm font-bold text-gray-600 italic">{status.lastText}</p>
                  </div>

                  {/* Bloc PROCHAIN SOIN */}
                  <div className={`rounded-3xl p-6 mb-4 ${status.bg} border border-current/10`}>
                    <p className={`text-[10px] font-black uppercase mb-1 ${status.color}`}>Prochain soin</p>
                    <p className={`text