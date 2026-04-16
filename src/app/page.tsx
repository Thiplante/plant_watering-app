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

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") router.push("/login");
      if (session) {
        setUser(session.user);
        fetchPlants();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  const fetchPlants = async () => {
    try {
      setLoading(true);
      
      // REQUÊTE SIMPLIFIÉE : La sécurité (RLS) de Supabase 
      // filtre automatiquement ce qu'on a le droit de voir.
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlants(data || []);
    } catch (err) {
      console.error("Erreur de récupération des plantes:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateWateringStatus = (lastDate: string, frequency: number) => {
    if (!lastDate) return { text: "À arroser !", color: "text-red-600", bg: "bg-red-50", urgent: true };
    
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + frequency);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);

    const isOverdue = nextDate < today;
    const formattedDate = nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    return {
      text: isOverdue ? `En retard (${formattedDate})` : formattedDate,
      color: isOverdue ? "text-red-600" : "text-green-600",
      bg: isOverdue ? "bg-red-50" : "bg-green-50",
      urgent: isOverdue
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0FDF4]">
        <div className="text-5xl animate-bounce mb-4">🌿</div>
        <p className="font-black text-green-900 tracking-widest uppercase italic">Recherche de tes plantes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-black selection:bg-green-200">
      <nav className="sticky top-0 z-50 flex items-center justify-between bg-white/90 backdrop-blur-lg px-8 py-5 shadow-sm border-b border-green-100">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌱</span>
          <span className="text-xl font-black text-gray-800 tracking-tighter uppercase">Plant Care</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden lg:block text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">{user?.email}</span>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="bg-red-50 text-red-500 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
          >
            Quitter
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6 lg:p-12">
        <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-8 rounded-[48px] bg-white p-12 shadow-2xl shadow-green-900/5 border border-green-50">
          <div className="text-center md:text-left">
            <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tighter italic">Ma Jungle 🌿</h1>
            <p className="text-gray-500 text-lg font-medium">Gère tes arrosages et partage tes plantes avec tes proches.</p>
          </div>
          <Link 
            href="/plants/new" 
            className="w-full md:w-auto text-center rounded-3xl bg-green-600 px-12 py-6 text-xl font-black text-white shadow-xl shadow-green-600/30 hover:bg-green-700 transition-all hover:-translate-y-1 active:scale-95"
          >
            + AJOUTER
          </Link>
        </div>

        {plants.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[48px] bg-white p-24 text-center border-4 border-dashed border-green-100 shadow-inner">
            <div className="text-8xl mb-8 grayscale opacity-50">🌵</div>
            <h2 className="text-2xl font-black text-gray-400 italic mb-4">C'est le désert ici...</h2>
            <p className="text-gray-400 mb-8 max-w-md">Si tu as des plantes sur Supabase, elles devraient apparaître maintenant.</p>
            <Link href="/plants/new" className="text-green-600 font-black border-b-4 border-green-600 pb-1 text-lg hover:text-green-800 hover:border-green-800 transition-all">Créer ma première plante</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {plants.map((plant) => {
              const status = calculateWateringStatus(plant.last_watered_at, plant.watering_frequency_days);
              return (
                <Link 
                  key={plant.id} 
                  href={`/plants/${plant.id}`} 
                  className="group relative block rounded-[44px] bg-white p-10 shadow-sm border border-transparent hover:border-green-400 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-300 active:scale-95"
                >
                  <div className="mb-10 flex items-start justify-between">
                    <h3 className="text-3xl font-black text-gray-800 tracking-tighter leading-tight group-hover:text-green-600 transition-colors">{plant.name}</h3>
                    <span className="rounded-2xl bg-gray-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {plant.watering_frequency_days}j
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className={`rounded-3xl p-6 border ${status.bg} border-current/10 transition-colors`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${status.color}`}>Prochain arrosage</p>
                      <p className={`text-2xl font-black ${status.color}`}>{status.text}</p>
                    </div>

                    <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Dernière fois</p>
                      <p className="text-lg font-bold text-gray-700">
                        {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : "Jamais arrosée"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-[0.4em]">Voir les détails →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}