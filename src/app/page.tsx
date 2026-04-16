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
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 1. Mes plantes
    const { data: myPlants } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", user.id);

    // 2. plantes partagées avec moi
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

    await supabase.from("plants").update({ last_watered_at: now }).eq("id", plant.id);

    await supabase.from("watering_logs").insert({
      plant_id: plant.id,
      watered_at: now,
      user_id: user?.id,
    });

    fetchPlants();
  };

  const calculateStatus = (lastDate?: string, frequency?: number) => {
    if (!lastDate) return { last: "Jamais", next: "?", isOverdue: false };

    const last = new Date(lastDate);
    const next = new Date(lastDate);
    next.setDate(next.getDate() + (frequency || 0));

    return {
      last: last.toLocaleDateString("fr-FR"),
      next: next < new Date() ? "RETARD" : next.toLocaleDateString("fr-FR"),
      isOverdue: next < new Date(),
    };
  };

  if (loading) return <div className="p-20 text-center">CHARGEMENT...</div>;

  return (
    <div className="p-10">
      <Link href="/plants/new">+ Ajouter</Link>

      <div className="grid gap-6 mt-6">
        {plants.map((plant) => {
          const status = calculateStatus(
            plant.last_watered_at,
            plant.watering_frequency_days
          );

          return (
            <Link key={plant.id} href={`/plants/${plant.id}`}>
              <div className="border p-6 rounded-xl">
                <h2>{plant.name}</h2>
                <p>Ville: {plant.city}</p>
                <p>Dernier: {status.last}</p>
                <p>Prochain: {status.next}</p>

                <button onClick={(e) => handleQuickWater(e, plant)}>
                  Arroser
                </button>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}