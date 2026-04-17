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

  const getFriendlyLastLabel = (lastDate: string) => {
    const now = new Date();
    const last = new Date(lastDate);

    const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startLast = new Date(last.getFullYear(), last.getMonth(), last.getDate());

    const diffMs = startNow.getTime() - startLast.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd’hui";
    if (diffDays === 1) return "Hier";
    return `Il y a ${diffDays} jours`;
  };

  const getDates = (plant: any) => {
    if (!plant.last_watered_at) {
      return {
        last: "Jamais",
        next: "À définir",
        label: "À définir",
        isOverdue: false,
      };
    }

    const now = new Date();
    const last = new Date(plant.last_watered_at);

    const next = new Date(plant.last_watered_at);
    next.setDate(next.getDate() + plant.watering_frequency_days);

    const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startNext = new Date(next.getFullYear(), next.getMonth(), next.getDate());

    const diffMs = startNext.getTime() - startNow.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let label = "";
    let isOverdue = false;

    if (diffDays < 0) {
      isOverdue = true;
      label = `En retard de ${Math.abs(diffDays)} jour${
        Math.abs(diffDays) > 1 ? "s" : ""
      }`;
    } else if (diffDays === 0) {
      label = "Aujourd’hui";
    } else if (diffDays === 1) {
      label = "Demain";
    } else {
      label = `Dans ${diffDays} jours`;
    }

    return {
      last: getFriendlyLastLabel(plant.last_watered_at),
      next: next.toLocaleDateString("fr-FR"),
      label,
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
          <div className="glass-card center-empty">🌿 Chargement...</div>
        </div>
      </main>
    );
  }

  const Section = ({ title, plants }: any) => (
    <section className="mb-10">
      <h2 className="section-title mb-6">
        {title} ({plants.length})
      </h2>

      {plants.length === 0 ? (
        <div className="soft-card center-empty">Rien ici 🌱</div>
      ) : (
        <div className="grid-elegant grid-elegant-3">
          {plants.map((plant: any) => {
            const dates = getDates(plant);

            return (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <div className="plant-card">
                  {plant.image_url ? (
                    <img
                      src={plant.image_url}
                      alt={plant.name}
                      className="mb-5 h-[220px] w-full rounded-[24px] object-cover"
                    />
                  ) : (
                    <div className="soft-card mb-5 flex h-[220px] items-center justify-center rounded-[24px] subtle-text">
                      🌿 Pas encore de photo
                    </div>
                  )}

                  <h3 className="plant-title">{plant.name}</h3>

                  <div className="pill-row mb-4">
                    <span className="pill">📍 {plant.city || "Ville inconnue"}</span>
                    <span className="pill">☀️ {plant.exposure || "Non définie"}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="status-card">
                      <span className="status-label">Dernier</span>
                      <span className="status-value">{dates.last}</span>
                    </div>

                    <div
                      className={`status-card ${
                        dates.isOverdue ? "status-card-danger" : ""
                      }`}
                    >
                      <span className="status-label">Prochain</span>
                      <span
                        className={
                          dates.isOverdue
                            ? "status-value status-value-danger"
                            : "status-value"
                        }
                      >
                        {dates.label}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleQuickWater(e, plant)}
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
        <div className="topbar-blur mb-10 p-6">
          <h1 className="hero-title">Dashboard 🌿</h1>
          <p className="subtle-text mt-2">
            Gère facilement l’arrosage de toutes tes plantes
          </p>
        </div>

        <Section title="🚨 En retard" plants={overdue} />
        <Section title="⏰ À arroser aujourd’hui" plants={today} />
        <Section title="🌱 Tout va bien" plants={normal} />
      </div>
    </main>
  );
}