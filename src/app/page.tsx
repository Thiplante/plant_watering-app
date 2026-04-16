// src/app/page.tsx
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

    const { data: myPlants } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    const { data: shares } = await supabase
      .from("plant_shares")
      .select("plant_id")
      .eq("user_email", user.email?.toLowerCase());

    let sharedPlants: any[] = [];

    if (shares && shares.length > 0) {
      const ids = shares.map((share) => share.plant_id);

      const { data } = await supabase
        .from("plants")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });

      sharedPlants = data || [];
    }

    const uniquePlantsMap = new Map();

    [...(myPlants || []), ...sharedPlants].forEach((plant) => {
      uniquePlantsMap.set(plant.id, plant);
    });

    setPlants(Array.from(uniquePlantsMap.values()));
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

  const calculateStatus = (lastDate?: string | null, frequency?: number) => {
    if (!lastDate || !frequency) {
      return {
        last: "Jamais",
        next: "À définir",
        isOverdue: false,
      };
    }

    const last = new Date(lastDate);
    const next = new Date(lastDate);
    next.setDate(next.getDate() + frequency);

    const isOverdue = next < new Date();

    return {
      last: last.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      next: next.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      isOverdue,
    };
  };

  if (loading) {
    return (
      <main className="page-shell">
        <div className="page-container">
          <div className="center-empty glass-card">
            <p className="hero-title" style={{ fontSize: "2rem" }}>
              🌿 Chargement...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="topbar-blur p-6 md:p-8 mb-8 md:mb-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow mb-3">Plant Care Studio</p>
              <h1 className="hero-title">Ma Jungle</h1>
              <p className="subtle-text mt-4 max-w-2xl text-base md:text-lg">
                Un espace doux et élégant pour suivre l’arrosage, l’exposition et
                l’équilibre de toutes tes plantes.
              </p>
            </div>

            <Link href="/plants/new" className="btn-primary w-full md:w-auto">
              + Ajouter une plante
            </Link>
          </div>
        </section>

        {plants.length === 0 ? (
          <section className="glass-card center-empty">
            <p className="eyebrow mb-3">Aucune plante</p>
            <h2 className="section-title mb-3">Commence ton jardin digital</h2>
            <p className="subtle-text mb-6">
              Ajoute ta première plante pour commencer à suivre ses arrosages.
            </p>
            <Link href="/plants/new" className="btn-primary">
              Créer une première plante
            </Link>
          </section>
        ) : (
          <section className="grid-elegant grid-elegant-3">
            {plants.map((plant) => {
              const status = calculateStatus(
                plant.last_watered_at,
                plant.watering_frequency_days
              );

              return (
                <Link key={plant.id} href={`/plants/${plant.id}`} className="block">
                  <article className="plant-card h-full">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <p className="eyebrow mb-3">
                          {plant.owner_id ? "Plante suivie" : "Plante"}
                        </p>
                        <h2 className="plant-title">{plant.name}</h2>
                      </div>

                      <div className="pill">
                        {plant.can_be_watered_by_rain ? "🌧️ Pluie active" : "💧 Manuel"}
                      </div>
                    </div>

                    <div className="pill-row mb-6">
                      <span className="pill">📍 {plant.city || "Ville inconnue"}</span>
                      <span className="pill">☀️ {plant.exposure || "Non définie"}</span>
                      <span className="pill">
                        ⏱️ {plant.watering_frequency_days || "?"} jours
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="status-card">
                        <span className="status-label">Dernier arrosage</span>
                        <span className="status-value">{status.last}</span>
                      </div>

                      <div
                        className={`status-card ${
                          status.isOverdue ? "status-card-danger" : ""
                        }`}
                      >
                        <span className="status-label">Prochain</span>
                        <span
                          className={
                            status.isOverdue
                              ? "status-value status-value-danger"
                              : "status-value"
                          }
                        >
                          {status.isOverdue ? `En retard · ${status.next}` : status.next}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleQuickWater(e, plant)}
                      className="btn-primary w-full"
                    >
                      💧 Arroser maintenant
                    </button>
                  </article>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}