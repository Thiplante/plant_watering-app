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

    // 1. Charger la plante
    const { data: plantData } = await supabase
      .from("plants")
      .select("*")
      .eq("id", plantId)
      .single();
    
    if (plantData) {
      setPlant(plantData);
      setName(plantData.name);

      // 2. Charger l'historique depuis la table watering_logs
      const { data: logs } = await supabase
        .from("watering_logs")
        .select("*")
        .eq("plant_id", plantId)
        .order("watered_at", { ascending: false });
      
      if (logs) setHistory(logs);
    }
    setLoading(false);
  };

  const handleUpdateName = async () => {
    const { error } = await supabase
      .from("plants")
      .update({ name: name })
      .eq("id", plantId);

    if (error) alert("Erreur : " + error.message);
    else alert("Nom mis à jour !");
  };

  const handleWaterPlant = async () => {
    const now = new Date().toISOString();
    
    // A. Mettre à jour la date principale sur la plante
    const { error: updateError } = await supabase
      .from("plants")
      .update({ last_watered_at: now })
      .eq("id", plantId);

    // B. Ajouter une ligne dans l'historique (watering_logs)
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("watering_logs").insert({
        plant_id: plantId,
        watered_at: now,
        user_id: userData.user.id
      });
    }

    if (updateError) alert(updateError.message);
    else loadData(); // Rafraîchir l'affichage
  };

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!plant) return <div className="p-10 text-center">Plante non trouvée.</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl bg-white p-6 rounded-3xl shadow-sm ring-1 ring-black/5">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-green-700 text-sm font-bold">← Retour</Link>
          <button 
            onClick={handleWaterPlant}
            className="rounded-2xl bg-[#111827] px-6 py-3 text-sm font-bold text-white transition hover:bg-black shadow-lg active:scale-95"
          >
            J'ai arrosé 💧
          </button>
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 mb-6">{plant.name}</h1>
        
        {/* MODIFICATION DU NOM */}
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

        {/* INFOS */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[10px] font-bold uppercase text-gray-400">Fréquence</p>
            <p className="font-bold text-gray-900">Tous les {plant.watering_frequency_days} jours</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[10px] font-bold uppercase text-gray-400">Dernier arrosage</p>
            <p className="font-bold text-gray-900">
              {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString() : "Jamais"}
            </p>
          </div>
        </div>

        {/* HISTORIQUE RÉEL */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Historique complet</h3>
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((log) => (
                <div key={log.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Arrosage effectué</span>
                  <span className="text-sm font-bold text-gray-900">
                    {new Date(log.watered_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">Aucun historique disponible.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}