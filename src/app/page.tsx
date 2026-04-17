"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Plant, PlantShare } from "@/lib/types";
import {
  getAdaptiveWateringInsight,
  getDashboardNotifications,
  getHealthInsight,
  getWeatherInsight,
} from "@/lib/plants/insights";

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

function toneClasses(tone: string) {
  switch (tone) {
    case "rain":
    case "good":
      return "bg-emerald-50 text-emerald-800 border border-emerald-100";
    case "heat":
    case "danger":
      return "bg-rose-50 text-rose-800 border border-rose-100";
    case "watch":
      return "bg-amber-50 text-amber-800 border border-amber-100";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-100";
  }
}

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
            const weatherInsight = getWeatherInsight(plant);
            const healthInsight = getHealthInsight(plant);
            const adaptive = getAdaptiveWateringInsight(plant);

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

                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${toneClasses(weatherInsight.tone)}`}>
                      {weatherInsight.label}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${toneClasses(healthInsight.tone)}`}>
                      {healthInsight.label}
                    </span>
                  </div>

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

                  <div className="mb-4 rounded-[24px] bg-[#f7faf7] px-4 py-4">
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-[#6f7f73]">
                      Dashboard meteo
                    </p>
                    <p className="text-sm font-semibold text-[#193425]">
                      {weatherInsight.detail}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-[#516154]">
                      {adaptive.label}: {adaptive.minDays}
                      {adaptive.maxDays !== adaptive.minDays
                        ? ` a ${adaptive.maxDays}`
                        : ""}{" "}
                      jours
                    </p>
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
  const notifications = getDashboardNotifications(plants);

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
        <div className="topbar-blur mb-6 p-6">
          <h1 className="hero-title">Dashboard intelligent</h1>
          <p className="subtle-text mt-2">
            Gere l&apos;arrosage, la meteo et les signaux de risque en un coup d&apos;oeil
          </p>
        </div>

        <section className="glass-card mb-10 p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Notifications</p>
              <h2 className="section-title !mb-0">Centre d&apos;attention</h2>
            </div>

            <div className="rounded-full bg-[#edf4ee] px-4 py-2 text-sm font-extrabold text-[#1d3a28]">
              {plants.length} plantes suivies
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {notifications.map((message) => (
              <div
                key={message}
                className="rounded-[24px] border border-[rgba(35,75,52,0.08)] bg-white/80 px-5 py-4 text-sm font-semibold text-[#1e3223]"
              >
                {message}
              </div>
            ))}
          </div>
        </section>

        <Section
          title="En retard"
          plants={overdue}
          onQuickWater={handleQuickWater}
          getDates={getDates}
        />
        <Section
          title="A arroser aujourd'hui"
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
