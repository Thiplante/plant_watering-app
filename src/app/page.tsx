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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

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

    const unique = new Map();
    [...(myPlants || []), ...sharedPlants].forEach((p) => {
      unique.set(p.id, p);
    });

    setPlants(Array.from(unique.values()));
    setLoading(false);
  };

  const handleWater = async (e: any, plant: any) => {
    e.preventDefault();
    const now = new Date().toISOString();

    await supabase.from("plants").update({ last_watered_at: now }).eq("id", plant.id);
    await supabase.from("watering_logs").insert({
      plant_id: plant.id,
      watered_at: now,
    });

    fetchPlants();
  };

  const getDates = (plant: any) => {
    if (!plant.last_watered_at) {
      return {
        last: "Jamais",
        next: "À définir",
        isOverdue: false,
      };
    }

    const last = new Date(plant.last_watered_at);
    const next = new Date(plant.last_watered_at);
    next.setDate(next.getDate() + plant.watering_frequency_days);

    const isOverdue = next < new Date();

    return {
      last: last.toLocaleDateString("fr-FR"),
      next: next.toLocaleDateString("fr-FR"),
      isOverdue,
    };
  };

  const getStatus = (plant: any) => {
    if (!plant.last_watered_at) return "unknown";

    const next = new Date(plant.last_watered_at);
    next.setDate(next.getDate() + plant.watering_frequency_days);

    const now = new Date();

    if (next < now) return "overdue";

    const diff = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (diff <= 1) return "today";

    return "ok";
  };

  const overdue = plants.filter((p) => getStatus(p) === "overdue");
  const today = plants.filter((p) => getStatus(p) === "today");
  const normal = plants.filter((p) => getStatus(p) === "ok");

  if (loading) {
    return (
      <main className="page-shell">
        <div className="page-container">
          <div className="glass-card center-empty">
            🌿 Chargement...
          </div>
        </div>
      </main>
    );
  }

  const Section = ({ title, plants, danger = false }: any) => (
    <section className="mb-10">
      <h2 className="section-title mb-6">
        {title} ({plants.length})
      </h2>

      {plants.length === 0 ? (
        <div className="soft-card center-empty">
          Rien ici 🌱
        </div>
      ) : (
        <div className="grid-elegant grid-elegant-3">
          {plants.map((plant: any) => {
            const dates = getDates(plant);

            return (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <div className="plant-card">

                  <h3 className="plant-title">{plant.name}</h3>

                  <div className="pill-row mb-4">
                    <span className="pill">📍 {plant.city}</span>
                    <span className="pill">☀️ {plant.exposure}</span>
                  </div>

                  {/* NOUVEAU BLOC */}
                  <div className="space-y-2 mb-4">

                    <div className="status-card">
                      <span className="status-label">Dernier</span>
                      <span className="status-value">{dates.last}</span>
                    </div>

                    <div className={`status-card ${danger ? "status-card-danger" : ""}`}>
                      <span className="status-label">Prochain</span>
                      <span className={danger ? "status-value status-value-danger" : "status-value"}>
                        {dates.isOverdue ? "RETARD" : dates.next}
                      </span>
                    </div>

                  </div>

                  <button
                    onClick={(e) => handleWater(e, plant)}
                    className="btn-primary w-full"
                  >
                    💧 Arroser
                  </button>

                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <main className="page-shell">
      <div className="page-container">

        <div className="topbar-blur p-6 mb-10">
          <h1 className="hero-title">Dashboard 🌿</h1>
          <p className="subtle-text mt-2">
            Gère facilement l’arrosage de toutes tes plantes
          </p>
        </div>

        <Section title="🚨 En retard" plants={overdue} danger />
        <Section title="⏰ À arroser aujourd’hui" plants={today} />
        <Section title="🌱 Tout va bien" plants={normal} />

      </div>
    </main>
  );
}