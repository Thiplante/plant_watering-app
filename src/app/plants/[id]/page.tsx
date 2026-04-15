"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import * as React from "react";

export default function PlantDetailPage({ params }: { params: any }) {
  // Correction de l'erreur "unknown"
  const resolvedParams = React.use(params) as any;
  const plantId = resolvedParams.id;

  const [plant, setPlant] = useState<any>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!plantId) return;
      const { data } = await supabase
        .from("plants")
        .select("*")
        .eq("id", plantId)
        .single();
      
      if (data) {
        setPlant(data);
        setName(data.name);
      }
      setLoading(false);
    }
    loadData();
  }, [plantId]);

  const handleUpdateName = async () => {
    const { data, error } = await supabase
      .from("plants")
      .update({ name: name })
      .eq("id", plantId)
      .select();

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      alert("Nom mis à jour !");
      // On rafraîchit l'affichage
      setPlant({ ...plant, name: name });
    }
  };

  if (loading) return <div className="p-10 text-center text-black">Chargement...</div>;
  if (!plant) return <div className="p-10 text-center text-black">Plante non trouvée.</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl bg-white p-6 rounded-3xl shadow-sm ring-1 ring-black/5">
        <Link href="/" className="text-green-700 text-sm font-bold hover:underline">← Retour</Link>
        
        <h1 className="text-3xl font-black mt-4 text-gray-900">{plant.name}</h1>
        
        <div className="mt-8 p-6 bg-green-50 rounded-2xl border border-green-100">
          <label className="block text-xs font-bold uppercase text-green-700 mb-2 italic">Modifier le nom de ta plante</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-black outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
              placeholder="Nouveau nom..."
            />
            <button
              onClick={handleUpdateName}
              className="rounded-xl bg-green-600 px-6 py-2 font-bold text-white hover:bg-green-700 transition shadow-md active:scale-95"
            >
              Enregistrer
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">Fréquence</p>
            <p className="font-bold text-gray-900 italic">Tous les {plant.watering_frequency_days} jours</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">Dernier arrosage</p>
            <p className="font-bold text-gray-900">
              {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString('fr-FR') : "Jamais"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}