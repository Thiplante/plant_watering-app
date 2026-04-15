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
      // 1. Récupérer les infos de la plante
      const { data: pData, error: pError } = await supabase
        .from("plants")
        .select("*")
        .eq("id", plantId)
        .single();

      if (pError) throw pError;

      if (pData) {
        setPlant(pData);
        setNewName(pData.name);
        
        // 2. Récupérer l'historique
        const { data: hData } = await supabase
          .from("watering_logs")
          .select("*")
          .eq("plant_id", plantId)
          .order("watered_at", { ascending: false });
        
        setHistory(hData || []);
      }
    } catch (err) {
      console.error("Erreur détaillée:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    await supabase.from("plants").update({ name: newName }).eq("id", plantId);
    setIsEditing(false);
    loadData();
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

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToShare = shareEmail.toLowerCase().trim();
    const { error } = await supabase
      .from("plant_shares")
      .insert({ plant_id: plantId, user_email: emailToShare });

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      alert("La plante est maintenant partagée avec " + emailToShare);
      setShareEmail("");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer cette plante ?")) return;
    const { error } = await supabase.from("plants").delete().eq("id", plantId);
    if (error) alert("Erreur : " + error.message);
    else router.push("/");
  };

  if (loading) return <div className="p-20 text-center font-bold italic text-green-800">Chargement...</div>;
  if (!plant) return (
    <div className="p-20 text-center">
      <p className="text-red-500 font-bold mb-4">Plante introuvable ou accès refusé.</p>
      <Link href="/" className="text-blue-500 underline">Retour à l'accueil</Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-white p-6 sm:p-12 text-black">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-10">
          <Link href="/" className="text-sm font-bold text-gray-400 hover:text-black transition">← RETOUR</Link>
          <button onClick={handleWaterPlant} className="bg-black text-white px-8 py-3 rounded-full font-bold text-sm shadow-xl active:scale-95 transition">
            J'AI ARROSÉ 💧
          </button>
        </div>

        <div className="mb-12">
          {isEditing ? (
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="text-3xl font-black border-b-2 border-black outline-none w-full" autoFocus />
              <button onClick={handleUpdateName} className="bg-green-500 text-white px-4 rounded-xl font-bold">OK</button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-black tracking-tighter">{plant.name}</h1>
              <button onClick={() => setIsEditing(true)} className="text-gray-300 hover:text-blue-500 transition text-2xl">🔧</button>
            </div>
          )}
        </div>

        {/* FORMULAIRE DE PARTAGE */}
        <div className="mb-10 p-6 bg-blue-50 rounded-[32px] border border-blue-100">
          <h3 className="text-sm font-black text-blue-900 mb-4 uppercase tracking-widest">Partager avec un proche</h3>
          <form onSubmit={handleShare} className="flex gap-2">
            <input 
              type="email" 
              placeholder="Email de son compte..." 
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-xs hover:bg-blue-800 transition">
              Inviter
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="bg-gray-50 p-6 rounded-[24px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Fréquence</p>
            <p className="font-bold text-xl">{plant.watering_frequency_days} jours</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[24px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Dernier arrosage</p>
            <p className="font-bold text-xl">{plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString() : "---"}</p>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-xl font-black mb-6">Historique</h2>
          <div className="space-y-3">
            {history.map((log) => (
              <div key={log.id} className="flex justify-between items-center p-5 bg-white border border-gray-100 rounded-2xl">
                <span className="font-bold text-gray-800">Arrosage effectué</span>
                <span className="text-gray-400 text-sm">
                  {new Date(log.watered_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-10 text-center">
          <button onClick={handleDelete} className="text-red-300 text-xs font-bold hover:text-red-600 transition uppercase tracking-widest">
            🗑️ Supprimer cette plante
          </button>
        </div>
      </div>
    </main>
  );
}