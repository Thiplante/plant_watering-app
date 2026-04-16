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
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [shareEmail, setShareEmail] = useState("");

  useEffect(() => { loadData(); }, [plantId]);

  const loadData = async () => {
    const { data: pData } = await supabase.from("plants").select("*").eq("id", plantId).single();
    if (pData) {
      setPlant(pData);
      setNewName(pData.name);
      const { data: hData } = await supabase.from("watering_logs").select("*").eq("plant_id", plantId).order("watered_at", { ascending: false });
      setHistory(hData || []);
    }
  };

  const handleUpdate = async () => {
    await supabase.from("plants").update({ name: newName }).eq("id", plantId);
    setIsEditing(false);
    loadData();
  };

  const handleWater = async () => {
    const now = new Date().toISOString();
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("plants").update({ last_watered_at: now }).eq("id", plantId);
    await supabase.from("watering_logs").insert({ plant_id: plantId, watered_at: now, user_id: session?.user.id });
    loadData();
  };

  const handleDelete = async () => {
    if (confirm("Supprimer ?")) {
      await supabase.from("plants").delete().eq("id", plantId);
      router.push("/");
    }
  };

  const handleShare = async () => {
    if (!shareEmail) return;
    const { error } = await supabase.from("plant_shares").insert({ plant_id: plantId, user_email: shareEmail });
    if (error) alert("Erreur partage");
    else { alert("Partagé !"); setShareEmail(""); }
  };

  if (!plant) return <div className="p-20 text-center font-black">CHARGEMENT...</div>;

  return (
    <main className="min-h-screen bg-white p-6 md:p-12 text-black">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <Link href="/" className="font-black text-gray-400">← RETOUR</Link>
          <button onClick={handleWater} className="bg-black text-white px-8 py-3 rounded-full font-black text-xs uppercase shadow-xl">Arroser 💧</button>
        </div>

        <div className="mb-12">
          {isEditing ? (
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="text-4xl font-black border-b-4 border-green-500 outline-none w-full italic" />
              <button onClick={handleUpdate} className="bg-green-500 text-white px-4 rounded-xl font-black">OK</button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-black italic tracking-tighter">{plant.name}</h1>
              <button onClick={() => setIsEditing(true)} className="text-2xl hover:scale-110">🔧</button>
            </div>
          )}
          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">Dernier : {new Date(plant.last_watered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* SECTION PARTAGE */}
        <div className="bg-blue-50 p-6 rounded-[32px] mb-8">
          <h3 className="text-[10px] font-black uppercase mb-3">Partager avec un ami (Email)</h3>
          <div className="flex gap-2">
            <input type="email" placeholder="ami@mail.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} className="flex-1 px-4 py-2 rounded-xl text-sm border-none shadow-inner" />
            <button onClick={handleShare} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">Partager</button>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-black mb-6 italic underline decoration-green-500">Historique</h2>
          <div className="space-y-2">
            {history.slice(0, 5).map(log => (
              <div key={log.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl text-[11px] font-bold">
                <span>💧 ARROSAGE</span>
                <span className="text-gray-400">{new Date(log.watered_at).toLocaleDateString()} à {new Date(log.watered_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center border-t pt-10">
          <button onClick={handleDelete} className="text-red-300 hover:text-red-600 font-black text-[10px] uppercase tracking-[0.3em]">Supprimer la plante</button>
        </div>
      </div>
    </main>
  );
}