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
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      if (pData) {
        setPlant(pData);
        setNewName(pData.name);
        
        const { data: hData } = await supabase
          .from("watering_logs")
          .select("*")
          .eq("plant_id", plantId)
          .order("watered_at", { ascending: false });
        
        setHistory(hData || []);
      }
    } catch (err) {
      console.error("Erreur chargement plante:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    await supabase.from("plants").update({ name: newName }).eq("id", plantId);
    setIsEditing(false);
    loadData();
  };

  const handleWaterPlant = async () => {
    const now = new Date().toISOString();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // 1. Mise à jour de la date sur la plante
      await supabase.from("plants").update({ last_watered_at: now }).eq("id", plantId);
      
      // 2. Insertion dans l'historique
      await supabase.from("watering_logs").insert({ 
        plant_id: plantId, 
        watered_at: now, 
        user_id: session.user.id 
      });
      
      loadData();
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    // CORRECTION : On force les minuscules pour éviter les erreurs de correspondance
    const emailToShare = shareEmail.toLowerCase().trim();
    
    const { error } = await supabase
      .from("plant_shares")
      .insert({ plant_id: plantId, user_email: emailToShare });

    if (error) {
      alert("Erreur ou déjà partagé : " + error.message);
    } else {
      alert("Partagé avec " + emailToShare);
      setShareEmail("");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer définitivement cette plante ?")) return;
    const { error } = await supabase.from("plants").delete().eq("id", plantId);
    if (error) alert("Erreur : " + error.message);
    else router.push("/");
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-green-800">Chargement...</div>;
  if (!plant) return (
    <div className="p-20 text-center">
      <p className="text-red-500 font-black mb-4 uppercase tracking-widest">Plante introuvable</p>
      <Link href="/" className="text-sm font-bold bg-black text-white px-6 py-2 rounded-full">Retour</Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-white p-6 sm:p-12 text-black font-sans">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-10">
          <Link href="/" className="text-sm font-black text-gray-400 hover:text-black transition tracking-tighter">← RETOUR</Link>
          <button onClick={handleWaterPlant} className="bg-black text-white px-8 py-3 rounded-full font-black text-xs shadow-xl active:scale-95 transition uppercase tracking-widest">
            J'AI ARROSÉ 💧
          </button>
        </div>

        <div className="mb-12">
          {isEditing ? (
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="text-4xl font-black border-b-4 border-black outline-none w-full" autoFocus />
              <button onClick={handleUpdateName} className="bg-green-500 text-white px-6 rounded-2xl font-black">OK</button>
            </div>
          ) : (
            <div className="flex items-center gap-4 group">
              <h1 className="text-5xl font-black tracking-tighter">{plant.name}</h1>
              <button onClick={() => setIsEditing(true)} className="text-gray-200 group-hover:text-blue-500 transition text-2xl">🔧</button>
            </div>
          )}
        </div>

        <div className="mb-12 p-8 bg-blue-50 rounded-[40px] border border-blue-100 shadow-sm shadow-blue-50">
          <h3 className="text-[10px] font-black text-blue-800 mb-4 uppercase tracking-[0.2em]">Partager avec un proche</h3>
          <form onSubmit={handleShare} className="flex gap-2">
            <input 
              type="email" 
              placeholder="Email du compte ami..." 
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="flex-1 px-5 py-4 rounded-2xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-400 shadow-inner"
              required
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs hover:bg-blue-700 transition">
              OK
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-12 text-center">
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fréquence</p>
            <p className="font-black text-2xl">{plant.watering_frequency_days}j</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dernier</p>
            <p className="font-black text-2xl">{plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString('fr-FR') : "---"}</p>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-xl font-black mb-6 tracking-tighter">Historique des soins</h2>
          <div className="space-y-3">
            {history.map((log) => (
              <div key={log.id} className="flex justify-between items-center p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm">
                <span className="font-black text-gray-800 text-sm italic">Arrosage effectué</span>
                <span className="text-gray-400 text-xs font-bold">
                  {new Date(log.watered_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-10 text-center">
          <button onClick={handleDelete} className="text-red-200 text-[10px] font-black hover:text-red-600 transition uppercase tracking-[0.3em]">
            🗑️ Supprimer la plante
          </button>
        </div>
      </div>
    </main>
  );
}