"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getRainToday } from "@/lib/weather";

export default function PlantDetailPage() {
  const params = useParams();
  const plantId = params.id as string;
  const router = useRouter();

  const [plant, setPlant] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [plantId]);

  const loadData = async () => {
    const { data: plant } = await supabase
      .from("plants")
      .select("*")
      .eq("id", plantId)
      .single();

    const { data: logs } = await supabase
      .from("watering_logs")
      .select("*")
      .eq("plant_id", plantId)
      .order("watered_at", { ascending: false });

    setPlant(plant);
    setHistory(logs || []);

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

    loadData();
  };

  const deletePlant = async () => {
    if (!confirm("Supprimer la plante ?")) return;
    await supabase.from("plants").delete().eq("id", plantId);
    router.push("/");
  };

  const deleteLog = async (id: string) => {
    await supabase.from("watering_logs").delete().eq("id", id);
    loadData();
  };

  const addWater = async () => {
    const rain = await getRainToday(plant.city);

    if (rain && plant.can_be_watered_by_rain) {
      alert("🌧️ Arrosée automatiquement par la pluie !");
    }

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

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black">
        🌿 Chargement...
      </div>
    );

  const chartData = history.map((log) => ({
    date: new Date(log.watered_at).toLocaleDateString(),
    value: 1,
  }));

  return (
    <div className="min-h-screen bg-[#F6FBF7] dark:bg-[#0b1a13] p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* RETOUR */}
        <button
          onClick={() => router.push("/")}
          className="text-gray-400 font-bold hover:text-green-600"
        >
          ← Retour
        </button>

        {/* CARD PRINCIPALE */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-white dark:bg-[#13241b] p-8 rounded-[40px] shadow-xl space-y-6"
        >
          <h1 className="text-4xl font-black text-green-900 dark:text-green-300">
            {plant.name}
          </h1>

          <button
            onClick={addWater}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold"
          >
            💧 Arroser
          </button>

          {/* FORM */}
          <div className="grid md:grid-cols-2 gap-4">

            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              className="input"
              placeholder="Nom"
            />

            <input
              value={form.city}
              onChange={(e) =>
                setForm({ ...form, city: e.target.value })
              }
              className="input"
              placeholder="Ville"
            />

            <select
              value={form.exposure}
              onChange={(e) =>
                setForm({ ...form, exposure: e.target.value })
              }
              className="input"
            >
              <option value="soleil">☀️ Soleil</option>
              <option value="mi-ombre">🌤️ Mi-ombre</option>
              <option value="ombre">☁️ Ombre</option>
            </select>

            <input
              type="number"
              value={form.frequency}
              onChange={(e) =>
                setForm({
                  ...form,
                  frequency: Number(e.target.value),
                })
              }
              className="input"
            />

          </div>

          <label className="flex items-center gap-3 font-bold">
            <input
              type="checkbox"
              checked={form.rain}
              onChange={(e) =>
                setForm({ ...form, rain: e.target.checked })
              }
            />
            🌧️ Arrosage par pluie
          </label>

          <button
            onClick={updatePlant}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700"
          >
            💾 Sauvegarder
          </button>
        </motion.div>

        {/* HISTORIQUE */}
        <div className="bg-white dark:bg-[#13241b] p-8 rounded-[40px] shadow-xl">
          <h2 className="text-xl font-black mb-6">Historique</h2>

          <div className="space-y-3">
            {history.map((log) => (
              <motion.div
                key={log.id}
                whileHover={{ scale: 1.02 }}
                className="flex justify-between items-center bg-gray-50 dark:bg-[#1d3328] p-4 rounded-2xl"
              >
                <span>
                  💧{" "}
                  {new Date(log.watered_at).toLocaleString()}
                </span>

                <button
                  onClick={() => deleteLog(log.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="bg-white dark:bg-[#13241b] p-8 rounded-[40px] shadow-xl">
          <h2 className="font-black mb-4">Stats</h2>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#16a34a"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* DELETE */}
        <button
          onClick={deletePlant}
          className="text-red-400 hover:text-red-600 font-bold text-center w-full"
        >
          Supprimer la plante
        </button>

      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 12px;
          border-radius: 16px;
          background: #f4f4f4;
          font-weight: bold;
          outline: none;
        }
      `}</style>
    </div>
  );
}