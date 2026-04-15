"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function PlantDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const plantId = params.id;

  const [plant, setPlant] = useState<any>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [shareEmail, setShareEmail] = useState("");

  useEffect(() => {
    loadData();
  }, [plantId]);

  const loadData = async () => {
    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .eq("id", plantId)
      .single();

    if (data) {
      setPlant(data);
      setName(data.name);
    }
    setLoading(false);
  };

  // --- ACTION : MODIFIER LE NOM ---
  const handleUpdateName = async () => {
    const { data, error } = await supabase
      .from("plants")
      .update({ name: name })
      .eq("id", plantId)
      .select();

    if (error) {
      alert("Erreur : " + error.message);
    } else if (data && data.length > 0) {
      alert("Nom mis à jour avec succès !");
      loadData();
    } else {
      alert("Droit refusé : Vous n'avez pas la permission de modifier cette plante.");
    }
  };

  // --- ACTION : ARROSER ---
  const handleWaterPlant = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("plants")
      .update({ last_watered_at: now })
      .eq("id", plantId);

    if (error) alert(error.message);
    else loadData();
  };

  if (loading) return <p className="p-8 text-center text-gray-500">Chargement...</p>;
  if (!plant) return <p className="p-8 text-center text-gray-500">Plante introuvable.</p>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-green-700 hover:underline text-sm font-medium">← Retour</Link>

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          {/* Header avec bouton Arrosage */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-600">Détail plante</p>
              <h1 className="text-3xl font-black text-gray-900">{plant.name}</h1>
            </div>
            <button 
              onClick={handleWaterPlant}
              className="flex items-center gap-2 rounded-2xl bg-[#111827] px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
            >
              J'ai arrosé 💧
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-8">Suis l’arrosage et partage cette plante avec quelqu’un.</p>

          {/* BLOC MODIFICATION (Ce qui te manquait) */}
          <div className="mb-8 rounded-2xl bg-green-50/50 p-4 ring-1 ring-green-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-green-700 mb-2">Modifier le nom</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
              />
              <button 
                onClick={handleUpdateName}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 transition"
              >
                Enregistrer
              </button>
            </div>
          </div>

          {/* Infos Fréquence / Arrosage */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fréquence</p>
              <p className="mt-1 font-bold text-gray-900 text-sm small:text-base">Tous les {plant.watering_frequency_days} jours</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dernier arrosage</p>
              <p className="mt-1 font-bold text-gray-900 text-sm">
                {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString() : "Jamais"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prochain arrosage</p>
              <p className="mt-1 font-bold text-gray-900 text-sm text-green-600">À arroser</p>
            </div>
          </div>

          {/* Partage */}
          <div className="mb-8 rounded-2xl bg-gray-50 p-6">
            <h3 className="text-lg font-bold text-gray-900">Partager la plante</h3>
            <p className="text-sm text-gray-500 mb-4">Ajoute l’email d’une personne pour qu’elle puisse suivre cette plante.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@exemple.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
              <button className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700">Partager</button>
            </div>
          </div>

          {/* Historique */}
          <div>
            <h3 className="text-lg font-bold text-gray-900">Historique</h3>
            <p className="text-sm text-gray-500 mb-4">Retrouve tous les arrosages enregistrés.</p>
            <div className="rounded-2xl bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-400 italic">Aucun arrosage enregistré</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}