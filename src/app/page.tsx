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

  // 1. Gestion de la session et authentification au montage
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push("/login");
        return;
      }

      setUser(session.user);
      await loadPlants(session.user.id, session.user.email!);
    };

    checkUser();

    // Ecouter les changements d'état (connexion/déconnexion)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      } else if (session) {
        setUser(session.user);
        loadPlants(session.user.id, session.user.email!);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // 2. Chargement des plantes (Propriétaire + Partagées)
  const loadPlants = async (userId: string, userEmail: string) => {
    try {
      setLoading(true);
      const emailLower = userEmail.toLowerCase().trim();

      // Requête complexe avec filtrage OR pour inclure les partages par email
      const { data, error } = await supabase
        .from("plants")
        .select(`
          *,
          plant_shares (user_email)
        `)
        .or(`owner_id.eq.${userId},id.in.(select plant_id from plant_shares where user_email.eq.${emailLower})`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlants(data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des plantes:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Calcul de la date du prochain arrosage
  const getNextWateringDate = (lastDate: string, frequency: number) => {
    if (!lastDate) return { text: "À faire !", urgent: true };
    
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + frequency);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    nextDate.setHours(0,0,0,0);

    const isPast = nextDate < today;
    
    return {
      text: nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      urgent: isPast
    };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // 4. États de chargement
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-black text-green-900 uppercase tracking-widest text-sm italic">Préparation de ta jungle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-black font-sans">
      {/* Barre de Navigation */}
      <nav className="sticky top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm border-b border-green-100">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌱</span>
          <span className="text-xl font-black text-gray-800 tracking-tighter uppercase">Plant Care</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.email}</span>
          <button 
            onClick={handleLogout} 
            className="text-xs font-black text-red-400 hover:text-red-600 transition uppercase tracking-widest bg-red-50 px-4 py-2 rounded-full"
          >
            Quitter
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6 md:p-12">
        {/* Header de la page */}
        <div className="mb-12 rounded-[48px] bg-white p-10 shadow-xl shadow-green-900/5 border border-green-50 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div>
            <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter italic">Ma Jungle 🌿</h1>
            <p className="text-gray-500 font-medium text-lg">Retrouve toutes tes plantes et celles de tes proches au même endroit.</p>
          </div>
          <Link 
            href="/plants/new" 
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-green-600 px-10 py-5 font-black text-white transition-all hover:bg-green-700 shadow-2xl shadow-green-600/20 active:scale-95 w-full md:w-auto"
          >
            <span className="text-lg">+ AJOUTER</span>
          </Link>
        </div>

        {/* Liste des plantes */}
        {plants.length === 0 ? (
          <div className="bg-white rounded-[48px] p-24 text-center border-4 border-dashed border-green-100">
            <div className="text-6xl mb-6">🌵</div>
            <p className="text-gray-400 font-black text-xl italic mb-6">Ta jungle est vide pour l'instant...</p>
            <Link href="/plants/new" className="text-green-600 font-bold border-b-2 border-green-600 pb-1">Commence par ajouter ta première plante</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {plants.map((plant) => {
              const status = getNextWateringDate(plant.last_watered_at, plant.watering_frequency_days);
              return (
                <Link 
                  key={plant.id} 
                  href={`/plants/${plant.id}`} 
                  className="group relative block rounded-[40px] bg-white p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-green-500 active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="text-3xl font-black tracking-tighter text-gray-800 leading-tight group-hover:text-green-600 transition-colors">
                      {plant.name}
                    </h3>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black bg-gray-100 px-3 py-1.5 rounded-full text-gray-500 uppercase tracking-widest">
                        {plant.watering_frequency_days} jours
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className={`rounded-3xl p-5 border transition-colors ${status.urgent ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                      <p className={`text-[10px] font-black uppercase mb-1 tracking-widest ${status.urgent ? 'text-red-500' : 'text-green-600'}`}>
                        {status.urgent ? '⚠️ Retard arrosage' : 'Prochain arrosage'}
                      </p>
                      <p className={`font-black text-2xl ${status.urgent ? 'text-red-800' : 'text-green-900'}`}>
                        {status.text}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Dernier soin</p>
                      <p className="font-black text-gray-700 text-lg">
                        {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : "Aucun historique"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <span className="text-xs font-black text-green-600 uppercase tracking-[0.3em]">Gérer la plante →</span>
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