"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

export default function PlantDetailPage() {
  const params = useParams();
  const plantId = params.id as string;
  const router = useRouter();

  const [plant, setPlant] = useState<any>(null);
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

    setPlant(plant);
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
    if (!confirm("Supprimer ?")) return;
    await supabase.from("plants").delete().eq("id", plantId);
    router.push("/");
  };

  if (loading) {
    return <div className="p-20 text-center">Chargement...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#F6FBF7] p-6 md:p-12"
    >
      <div className="max-w-xl mx-auto space-y-6">

        <button onClick={() => router.push("/")}>
          ← Retour
        </button>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-8 rounded-3xl shadow-lg space-y-4"
        >
          <h1 className="text-3xl font-black">
            {plant.name}
          </h1>

          <input
            className="input"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            className="input"
            value={form.city}
            onChange={(e) =>
              setForm({ ...form, city: e.target.value })
            }
          />

          <select
            className="input"
            value={form.exposure}
            onChange={(e) =>
              setForm({ ...form, exposure: e.target.value })
            }
          >
            <option value="soleil">Soleil</option>
            <option value="mi-ombre">Mi-ombre</option>
            <option value="ombre">Ombre</option>
          </select>

          <input
            type="number"
            className="input"
            value={form.frequency}
            onChange={(e) =>
              setForm({
                ...form,
                frequency: Number(e.target.value),
              })
            }
          />

          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={form.rain}
              onChange={(e) =>
                setForm({ ...form, rain: e.target.checked })
              }
            />
            🌧️ pluie
          </label>

          <button
            onClick={updatePlant}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Sauvegarder
          </button>
        </motion.div>

        <button
          onClick={deletePlant}
          className="text-red-500 font-bold"
        >
          Supprimer
        </button>

      </div>
    </motion.div>
  );
}