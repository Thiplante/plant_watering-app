"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import * as React from "react";

export default function PlantDetailPage({ params }: { params: any }) {
  const resolvedParams = React.use(params) as any;
  const plantId = resolvedParams.id;

  const [plant, setPlant] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [plantId]);

  const loadData = async () => {
    if (!plantId) return;
    const { data: pData } = await supabase.from("plants").select("*").eq("id", plantId).single();
    if (pData) {
      setPlant(pData);
      setNewName(pData.name);
      const { data: hData } = await supabase.from("watering_logs").select("*").eq("plant_id", plantId).order("watered_at", { ascending: false });
      setHistory(hData || []);
    }
    setLoading(false);
  };

  const handleUpdateName = async () => {
    await supabase.from("plants").update({ name: newName }).eq("id", plantId);
    setIsEditing(false);
    loadData();
  };

  const handleWaterPlant = async () => {
    const now = new Date().toISOString();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("plants").update({ last_watered_at: now }).eq("id", plantId);
      await supabase.from("watering_logs").insert({ plant_id: plantId, watered_at: now, user_id: auth.user.id });
      loadData();
    }
  };

  if (loading) return <div className="p-20 text-center font-bold">Chargement...</div>;
  if (!plant) return <div className="p-20 text-center text-red-500">Plante introuvable.</div>;

  return (
    <main className="min-h-screen bg-white p-6 sm:p-12 text-black">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-10">
          <Link href="/" className="text-sm font-bold text-gray-400 hover:text-black transition">← RETOUR</Link>
          <button onClick={handleWaterPlant} className="bg-black text-white px-8 py-3 rounded-full font-bold text-sm shadow-xl active:scale-95 transition">
            J'AI ARROSÉ 💧
          </button>
        </div>

        {/* NOM DE LA PLANTE + ICONE CLÉ */}
        <div className="mb-12">
          {isEditing ? (
            <div className="flex gap-2">
              <input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="text-3xl font-black border-b-2 border-black outline-none w-full"
                autoFocus
              />
              <button onClick={handleUpdateName} className="bg-green-500 text-white px-4 rounded-xl font-bold">OK</button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-black tracking-tighter">{plant.name}</h1>
              <button 
                onClick={() => setIsEditing(true)} 
                className="text-gray-300 hover:text-blue-500 transition text-2xl"
                title="Modifier le nom"
              >
                🔧
              </button>
            </div>
          )}
          <p className="text-gray-400 mt-2 font-medium italic">Clique sur la clé pour renommer ta plante</p>
        </div>

        {/* GRILLE INFOS */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="bg-gray-50 p-6 rounded-[24px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fréquence</p>
            <p className="font-bold text-xl">{plant.watering_frequency_days} jours</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[24px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dernier</p>
            <p className="font-bold text-xl">{plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString() : "---"}</p>
          </div>
        </div>

        {/* HISTORIQUE */}
        <div>
          <h2 className="text-xl font-black mb-6">Historique des soins</h2>
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((log) => (
                <div key={log.id} className="flex justify-between items-center p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <span className="font-bold text-gray-800">Arrosage</span>
                  <span className="text-gray-400 text-sm font-medium">
                    {new Date(log.watered_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic text-center py-10">Pas encore d'historique.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}