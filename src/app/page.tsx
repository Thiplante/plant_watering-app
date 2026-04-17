"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Plant, PlantShare } from "@/lib/types";

type PlantStatus = "unknown" | "overdue" | "today" | "ok";

type PlantDateInfo = {
  last: string;
  next: string;
  label: string;
  isOverdue: boolean;
};

type SectionProps = {
  title: string;
  plants: Plant[];
  onQuickWater: (event: React.MouseEvent<HTMLButtonElement>, plant: Plant) => void;
  getDates: (plant: Plant) => PlantDateInfo;
};

function Section({ title, plants, onQuickWater, getDates }: SectionProps) {
  return (
    <section className="mb-10">
      <h2 className="section-title mb-6">
        {title} ({plants.length})
      </h2>

      {plants.length === 0 ? (
        <div className="soft-card center-empty">Rien ici</div>
      ) : (
        <div className="grid-elegant grid-elegant-3">
          {plants.map((plant) => {
            const dates = getDates(plant);

            return (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <div className="plant-card">
                  {plant.image_url ? (
                    <Image
                      src={plant.image_url}
                      alt={plant.name}
                      width={800}
                      height={440}
                      className="mb-5 h-[220px] w-full rounded-[24px] object-cover"
                    />
                  ) : (
                    <div className="soft-card mb-5 flex h-[220px] items-center justify-center rounded-[24px] subtle-text">
                      Pas encore de photo
                    </div>
                  )}

                  <h3 className="plant-title">{plant.name}</h3>

                  <div className="pill-row mb-4">
                    <span className="pill">{plant.city || "Ville inconnue"}</span>
                    <span className="pill">{plant.exposure || "Non definie"}</span>
                  </div>

                  <div className="mb-4 space-y-2">
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
                    onClick={(event) => onQuickWater(event, plant)}
                    className="btn-primary w-full"
                  >
                    Arroser
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPlants = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: myPlantsData } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    const myPlants = (myPlantsData || []) as Plant[];

    const { data: sharesData } = await supabase
      .from("plant_shares")
      .select("plant_id")
      .eq("user_email", user.email?.toLowerCase());

    const shares = (sharesData || []) as Pick<PlantShare, "plant_id">[];

    let sharedPlants: Plant[] = [];

    if (shares.length > 0) {
      const ids = shares.map((share) => share.plant_id);
      const { data } = await supabase
        .from("plants")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });

      sharedPlants = (data || []) as Plant[];
    }

    const uniquePlantsMap = new Map<string, Plant>();

    [...myPlants, ...sharedPlants].forEach((plant) => {
      uniquePlantsMap.set(plant.id, plant);
    });

    setPlants(Array.from(uniquePlantsMap.values()));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    startTransition(() => {
      void fetchPlants();
    });
  }, [fetchPlants]);

  const handleQuickWater = async (
    event: React.MouseEvent<HTMLButtonElement>,
    plant: Plant
  ) => {
    event.preventDefault();
    setLoading(true);

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

    await fetchPlants();
  };

  const getFriendlyLastLabel = (lastDate: string) => {
    const now = new Date();
    const last = new Date(lastDate);
    const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startLast = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const diffMs = startNow.getTime() - startLast.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    return `Il y a ${diffDays} jours`;
  };

  const getDates = (plant: Plant): PlantDateInfo => {
    if (!plant.last_watered_at) {
      return {
        last: "Jamais",
        next: "A definir",
        label: "A definir",
        isOverdue: false,
      };
    }

    const now = new Date();
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
      label = "Aujourd'hui";
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

  const getStatus = (plant: Plant): PlantStatus => {
    if (!plant.last_watered_at) return "unknown";

    const next = new Date(plant.last_watered_at);
    next.setDate(next.getDate() + plant.watering_frequency_days);
    const now = new Date();

    if (next < now) return "overdue";

    const diff = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1) return "today";

    return "ok";
  };

  const overdue = plants.filter((plant) => getStatus(plant) === "overdue");
  const today = plants.filter((plant) => getStatus(plant) === "today");
  const normal = plants.filter((plant) => getStatus(plant) === "ok");

  if (loading) {
    return (
      <main className="page-shell">
        <div className="page-container">
          <div className="glass-card center-empty">Chargement...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <div className="topbar-blur mb-10 p-6">
          <h1 className="hero-title">Dashboard</h1>
          <p className="subtle-text mt-2">
            Gere facilement l&apos;arrosage de toutes tes plantes
          </p>
        </div>

        <Section
          title="En retard"
          plants={overdue}
          onQuickWater={handleQuickWater}
          getDates={getDates}
        />
        <Section
          title="A arroser aujourd&apos;hui"
          plants={today}
          onQuickWater={handleQuickWater}
          getDates={getDates}
        />
        <Section
          title="Tout va bien"
          plants={normal}
          onQuickWater={handleQuickWater}
          getDates={getDates}
        />
      </div>
    </main>
  );
}
