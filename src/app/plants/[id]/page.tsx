"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

export default function PlantDetailPage({ params }: { params: any }) {
  const resolvedParams = React.use(params) as any;
  const plantId = resolvedParams.id;
  const router = useRouter();

  const [plant, setPlant] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadData();
  }, [plantId]);

  const loadData = async () => {
    if (!plantId) return;
    try {
      const { data: pData, error: pError } = await supabase
        .from("plants")
        .select("*")
        .eq("id", plantId)
        .single();

      if (pError) throw pError;
      setPlant(pData);
      setNewName(pData.name);
        
      const { data: hData } = await supabase
        .from("watering_logs")
        .select("*")
        .eq("plant_id", plantId)
        .order("watered_at", { ascending: false });
      
      setHistory(hData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase
      .from("plants")
      .update({ name: newName.trim() })
      .eq("id", plantId);

    if (error) {
      alert("Erreur de modification : " + error.message);
    } else {
      setIsEditing(false);
      loadData();
    }
  };

  const handleWaterPlant = async () => {
    const now = new Date().toISOString();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("plants").update({ last_watered_at: now }).eq("id", plantId);
      await supabase.from("watering_logs").insert({ 
        plant_id: plantId, 
        watered_at: now, 
        user_id: session.user.id 
      });
      loadData();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer définitivement cette plante ?")) return;
    const { error } = await supabase.from("plants").delete().eq("id", plantId);
    if (error) {
      alert("Erreur de suppression : " + error.message);
    } else {
      router.push("/");
    }
  };

  const getAIRecommendation = () => {
    if (plant.exposure === "soleil") {
      return { tip: "Exposition forte : L'évaporation est rapide. Surveillez la terre.", style: "bg-orange-50 text-orange-700 border-orange-100" };
    }
    if (plant.can_be_watered_by_rain) {
      return { tip: "Mode Pluie : L'IA analyse les précipitations à " + plant.city + " pour ajuster le prochain arrosage.", style: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    return { tip: "Conditions stables : Continuez le cycle de " + plant.watering_frequency_days + " jours.", style: "bg-green-50 text-green-700 border-green-100" };
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-green-800">ANALYSE EN COURS...</div>;
  if (!plant) return <div className="p-20 text-center uppercase font-black">Plante perdue...</div>;

  const ai = getAIRecommendation();

  return (
    <main className="min-h-screen bg-white p-6 sm:p-12 text-black font-sans">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-10">
          <Link href="/" className="text-sm font-black text-gray-400 hover:text-black transition tracking-tighter">← RETOUR</Link>
          <div className="flex gap-2">
            <button 
              onClick={handleWaterPlant} 
              className="bg-black text-white px-6 py-3 rounded-full font-black text-xs shadow-xl active:scale-95 transition uppercase tracking-widest"
            >
              ARROSER 💧
            </button>
          </div>
        </div>

        <div className="mb-8">
          {isEditing ? (
            <div className="flex gap-3">
              <input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="text-4xl font-black border-b-4 border-green-500 outline-none w-full italic"
              />
              <button onClick={handleUpdateName} className="bg-green-500 text-white px-6 rounded-2xl font-black text-xs">OK</button>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 font-black text-xs">ANNULER</button>
            </div>
          ) : (
            <div className="flex items-center gap-4 group">
              <h1 className="text-5xl font-black tracking-tighter italic">{plant.name}</h1>
              <button onClick={() => setIsEditing(true)} className="text-gray-200 group-hover:text-blue-500 transition text-2xl">🔧</button>
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500">📍 {plant.city}</span>
            <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500">🔆 {plant.exposure}</span>
          </div>
        </div>

        <div className={`mb-12 p-8 rounded-[32px] border-2 ${ai.style}`}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">Analyse Smart Care</h3>
          <p className="font-bold italic text-lg">{ai.tip}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fréquence</p>
            <p className="font-black text-2xl">{plant.watering_frequency_days}j</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pluie</p>
            <p className="font-black text-2xl">{plant.can_be_watered_by_rain ? "OUI" : "NON"}</p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-black mb-6 tracking-tighter uppercase underline decoration-green-500 underline-offset-8 italic">Historique</h2>
          <div className="space-y-3">
            {history.length === 0 ? <p className="text-gray-300 italic">Aucun log.</p> : history.slice(0, 5).map((log) => (
              <div key={log.id} className="flex justify-between items-center p-5 bg-white border border-gray-100 rounded-[24px]">
                <span className="font-black text-gray-800 text-sm italic">💧 Arrosage</span>
                <span className="text-gray-400 text-[10px] font-bold">
                  {new Date(log.watered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-10 border-t border-gray-100 flex justify-center">
          <button 
            onClick={handleDelete}
            className="text-red-200 hover:text-red-600 transition font-black text-[10px] uppercase tracking-[0.3em]"
          >
            🗑️ Supprimer la plante
          </button>
        </div>
      </div>
    </main>
  );
}