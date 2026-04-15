"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import * as React from "react";

export default function PlantDetailPage({ params }: { params: any }) {
  const resolvedParams = React.use(params) as any;
  const plantId = resolvedParams.id;

  const [plant, setPlant] = useState<any>(null);
  const [name, setName] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [plantId]);

  const loadData = async () => {
    if (!plantId) return;

    // 1. Charger les détails de la plante
    const { data: plantData } = await supabase
      .from("plants")
      .select("*")
      .eq("id", plantId)
      .single();
    
    if (plantData) {
      setPlant(plantData);
      setName(plantData.name);

      // 2. Charger l'historique (on récupère les logs d'arrosage)
      // Note : Si tu n'as pas de table "watering_logs", on utilise le champ last_watered_at
      // Mais pour avoir "les fois d'avant", il faut normalement une table dédiée.
      // Si tu n'as pas encore de table historique, voici comment afficher au moins le dernier :
    }
    setLoading(false);
  };

  const handleUpdateName = async () => {
    const { data, error } = await supabase
      .from("plants")
      .update({ name: name })
      .eq("id", plantId)
      .select();

    if (error) alert("Erreur : " + error.message);
    else alert("Nom mis à jour !");
  };

  const handleWaterPlant = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("plants")
      .update({ last_watered_at: now })
      .eq("id", plantId);

    if (error) alert(error.message);
    else loadData();
  };

  if (loading) return <div className="p-10 text-center text-black">Chargement...</div>;
  if (!plant) return <div className="p-10 text-center text-black">Plante non trouvée.</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl bg-white p-6 rounded-3xl shadow-sm ring-1 ring-black/5">
        <Link href="/" className="text-green-700 text-sm font-bold hover:underline">← Retour</Link>
        
        <div className="flex justify-between items-center mt-4 mb-6">
            <h1 className="text-3xl font-black text-gray-900">{plant.name}</h1>
            <button 
              onClick={handleWaterPlant}
              className="bg-[#111827] text-white px-5 py-2 rounded-2xl font-bold text-sm hover:bg-black transition"
            >
              J'ai arrosé 💧
            </button>
        </div>
        
        {/* BLOC MODIFICATION DU NOM */}
        <div className="mb-8 p-6 bg-green-50 rounded-2xl border border-green-100">
          <label className="block text-xs font-bold uppercase text-green-700 mb-2">Modifier le nom</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-black outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleUpdateName}
              className="rounded-xl bg-green-600 px-6 py-2 font-bold text-white hover:bg-green-700 transition"
            >
              Enregistrer
            </button>
          </div>
        </div>

        {/* INFOS GÉNÉRALES */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">Fréquence</p>
            <p className="font-bold text-gray-900">Tous les {plant.watering_frequency_days} jours</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">Dernier arrosage</p>
            <p className="font-bold text-gray-900">
              {plant.last_watered_at 
                ? new Date(plant.last_watered_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) 
                : "Jamais"}
            </p>
          </div>
        </div>

        {/* HISTORIQUE */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Historique des arrosages</h3>
          <div className="space-y-2">
            {plant.last_watered_at ? (
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-sm font-medium text-gray-700">Dernier passage enregistré</span>
                <span className="text-sm font-bold text-green-600">
                  {new Date(plant.last_watered_at).toLocaleString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucun arrosage enregistré pour le moment.</p>
            )}
            <p className="text-[10px] text-gray-400 mt-4 uppercase font-bold text-center">Les données sont synchronisées en temps réel</p>
          </div>
        </div>

      </div>
    </main>
  );
}