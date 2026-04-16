"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";

export default function PlantDetailPage() {
  const params = useParams();
  const plantId = params.id as string;
  const router = useRouter();

  const [plant, setPlant] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<any>({
    name: "",
    city: "",
    exposure: "",
    frequency: 3,
    rain: false,
  });

  useEffect(() => {
    loadData();
  }, [plantId]);

  const loadData = async () => {
    const { data: plant } = await supabase
      .from("plants")
      .select("*")
      .eq("id", plantId)
      .single();

    const { data: history } = await supabase
      .from("watering_logs")
      .select("*")
      .eq("plant_id", plantId)
      .order("watered_at", { ascending: false });

    setPlant(plant);
    setHistory(history || []);

    setForm({
      name: plant.name,
      city: plant.city,
      exposure: plant.exposure,
      frequency: plant.watering_frequency_days,
      rain: plant.can_be_watered_by_rain,
    });

    setLoading(false);
  };

  const updatePlant = async () => {
    await supabase.from("plants").update({
      name: form.name,
      city: form.city,
      exposure: form.exposure,
      watering_frequency_days: form.frequency,
      can_be_watered_by_rain: form.rain,
    }).eq("id", plantId);

    alert("Mis à jour !");
    loadData();
  };

  const deletePlant = async () => {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("plants").delete().eq("id", plantId);
    router.push("/");
  };

  const deleteLog = async (id: string) => {
    await supabase.from("watering_logs").delete().eq("id", id);
    loadData();
  };

  const addWater = async () => {
    const now = new Date().toISOString();

    await supabase.from("plants").update({
      last_watered_at: now,
    }).eq("id", plantId);

    await supabase.from("watering_logs").insert({
      plant_id: plantId,
      watered_at: now,
    });

    loadData();
  };

  if (loading) return <div>CHARGEMENT...</div>;

  return (
    <div className="p-10 max-w-xl mx-auto space-y-6">

      <button onClick={() => router.push("/")}>← Retour</button>

      <button onClick={addWater}>💧 Arroser</button>

      <div className="space-y-4">

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom" />
        
        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ville" />

        <select value={form.exposure} onChange={(e) => setForm({ ...form, exposure: e.target.value })}>
          <option value="soleil">Soleil</option>
          <option value="mi-ombre">Mi-ombre</option>
          <option value="ombre">Ombre</option>
        </select>

        <input
          type="number"
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: Number(e.target.value) })}
        />

        <label>
          <input
            type="checkbox"
            checked={form.rain}
            onChange={(e) => setForm({ ...form, rain: e.target.checked })}
          />
          Pluie
        </label>

        <button onClick={updatePlant}>💾 Sauvegarder</button>
      </div>

      <div>
        <h3>Historique</h3>

        {history.map((log) => (
          <div key={log.id} className="flex justify-between border p-2">
            <span>{new Date(log.watered_at).toLocaleString()}</span>
            <button onClick={() => deleteLog(log.id)}>❌</button>
          </div>
        ))}
      </div>

      <button onClick={deletePlant} className="text-red-500">
        Supprimer la plante
      </button>

    </div>
  );
}