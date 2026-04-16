"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

    await supabase.from("plants").update({ last_watered_at: now }).eq("id", plant.id);
    await supabase.from("watering_logs").insert({
      plant_id: plant.id,
      watered_at: now,
    });

    fetchPlants();
  };

  const calculateNext = (last: string, freq: number) => {
    const next = new Date(last);
    next.setDate(next.getDate() + freq);
    return next;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black">🌿 Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#F6FBF7] p-6 md:p-12">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-black tracking-tight text-green-900">
            Ma Jungle 🌱
          </h1>

          <Link
            href="/plants/new"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg"
          >
            + Ajouter
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plants.map((plant) => {
            const next = calculateNext(
              plant.last_watered_at,
              plant.watering_frequency_days
            );

            const overdue = next < new Date();

            return (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <div className="group bg-white p-6 rounded-[32px] shadow-md hover:shadow-xl transition-all border border-green-50 hover:border-green-300">

                  <h2 className="text-2xl font-black text-gray-900 mb-3">
                    {plant.name}
                  </h2>

                  <div className="flex gap-2 text-xs font-bold text-gray-400 mb-4">
                    <span className="bg-gray-50 px-3 py-1 rounded-lg">
                      📍 {plant.city}
                    </span>
                    <span className="bg-gray-50 px-3 py-1 rounded-lg">
                      ☀️ {plant.exposure}
                    </span>
                  </div>

                  <div className="mb-5">
                    <p className="text-sm text-gray-500">
                      Dernier :{" "}
                      <span className="font-bold text-gray-800">
                        {new Date(plant.last_watered_at).toLocaleDateString()}
                      </span>
                    </p>

                    <p className={`text-sm font-bold ${
                      overdue ? "text-red-500" : "text-green-600"
                    }`}>
                      {overdue
                        ? "En retard 🚨"
                        : "Prochain : " + next.toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleQuickWater(e, plant)}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:scale-95 transition"
                  >
                    💧 Arroser
                  </button>

                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}