"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function HomePage() {
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 🌿 Mes plantes
    const { data: myPlants } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    // 👥 Partages
    const { data: shares } = await supabase
      .from("plant_shares")
      .select("plant_id")
      .eq("user_email", user.email);

    let sharedPlants: any[] = [];

    if (shares && shares.length > 0) {
      const ids = shares.map((s) => s.plant_id);

      const { data } = await supabase
        .from("plants")
        .select("*")
        .in("id", ids);

      sharedPlants = data || [];
    }

    const allPlants = [...(myPlants || []), ...sharedPlants];

    setPlants(allPlants);
    setLoading(false);
  };

  const handleQuickWater = async (e: React.MouseEvent, plant: any) => {
    e.preventDefault();

    const now = new Date().toISOString();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("plants")
      .update({ last_watered_at: now })
      .eq("id", plant.id);

    await supabase.from("watering_logs").insert({
      plant_id: plant.id,
      watered_at: now,
      user_id: user?.id,
    });

    fetchPlants();
  };

  const calculateNext = (last: string, freq: number) => {
    if (!last) return null;

    const next = new Date(last);
    next.setDate(next.getDate() + freq);
    return next;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-xl">
        🌿 Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6FBF7] dark:bg-[#0b1a13] p-6 md:p-12 text-black dark:text-white">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-black tracking-tight text-green-900 dark:text-green-300">
            Ma Jungle 🌱
          </h1>

          <Link
            href="/plants/new"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg"
          >
            + Ajouter
          </Link>
        </div>

        {/* EMPTY */}
        {plants.length === 0 && (
          <div className="bg-white dark:bg-[#13241b] p-10 rounded-3xl text-center shadow">
            <h2 className="text-2xl font-black mb-2">
              Aucune plante 🌱
            </h2>
            <p className="text-gray-500 mb-6">
              Commence par en ajouter une !
            </p>

            <Link
              href="/plants/new"
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold"
            >
              Ajouter une plante
            </Link>
          </div>
        )}

        {/* GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plants.map((plant) => {
            const next = calculateNext(
              plant.last_watered_at,
              plant.watering_frequency_days
            );

            const overdue = next && next < new Date();

            return (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-[#13241b] p-6 rounded-[32px] shadow-md hover:shadow-xl transition border border-green-50 hover:border-green-300 cursor-pointer"
                >
                  <h2 className="text-2xl font-black mb-3">
                    {plant.name}
                  </h2>

                  {/* INFOS */}
                  <div className="flex gap-2 text-xs font-bold text-gray-400 mb-4">
                    <span className="bg-gray-50 dark:bg-[#1d3328] px-3 py-1 rounded-lg">
                      📍 {plant.city || "?"}
                    </span>
                    <span className="bg-gray-50 dark:bg-[#1d3328] px-3 py-1 rounded-lg">
                      ☀️ {plant.exposure || "?"}
                    </span>
                  </div>

                  {/* STATUS */}
                  <div className="mb-5 space-y-1">
                    <p className="text-sm text-gray-500">
                      Dernier :{" "}
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {plant.last_watered_at
                          ? new Date(
                              plant.last_watered_at
                            ).toLocaleDateString()
                          : "Jamais"}
                      </span>
                    </p>

                    {overdue ? (
                      <p className="text-sm font-bold text-red-500">
                        ⚠️ En retard
                      </p>
                    ) : (
                      next && (
                        <p className="text-sm font-bold text-green-600">
                          Prochain : {next.toLocaleDateString()}
                        </p>
                      )
                    )}
                  </div>

                  {/* ACTION */}
                  <button
                    onClick={(e) => handleQuickWater(e, plant)}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:scale-95 transition"
                  >
                    💧 Arroser
                  </button>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}