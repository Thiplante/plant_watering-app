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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data: myPlants } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", user.id);

    const { data: shares } = await supabase
      .from("plant_shares")
      .select("plant_id")
      .eq("user_email", user.email);

    let sharedPlants: any[] = [];

    if (shares?.length) {
      const ids = shares.map((s) => s.plant_id);
      const { data } = await supabase.from("plants").select("*").in("id", ids);
      sharedPlants = data || [];
    }

    setPlants([...(myPlants || []), ...sharedPlants]);
    setLoading(false);
  };

  const handleQuickWater = async (e: any, plant: any) => {
    e.preventDefault();
    const now = new Date().toISOString();

    await supabase.from("plants").update({
      last_watered_at: now,
    }).eq("id", plant.id);

    await supabase.from("watering_logs").insert({
      plant_id: plant.id,
      watered_at: now,
    });

    fetchPlants();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black">
        🌿 Chargement...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#F6FBF7] p-6 md:p-12"
    >
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-black text-green-900">
            Ma Jungle 🌱
          </h1>

          <Link
            href="/plants/new"
            className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold"
          >
            + Ajouter
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plants.map((plant) => (
            <Link key={plant.id} href={`/plants/${plant.id}`}>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white p-6 rounded-3xl shadow-lg cursor-pointer"
              >
                <h2 className="text-2xl font-black mb-2">
                  {plant.name}
                </h2>

                <p className="text-sm text-gray-500 mb-3">
                  📍 {plant.city}
                </p>

                <button
                  onClick={(e) => handleQuickWater(e, plant)}
                  className="w-full bg-black text-white py-3 rounded-xl font-bold"
                >
                  💧 Arroser
                </button>

              </motion.div>

            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}