"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Plant = {
  id: string;
  name: string;
  watering_frequency_days: number;
  last_watered_at: string | null;
  owner_id: string;
};

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);

  const fetchPlants = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: ownedPlants, error: ownedError } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (ownedError) {
      console.error(ownedError);
      return;
    }

    const { data: shares, error: sharesError } = await supabase
      .from("plant_shares")
      .select("plant_id")
      .eq("user_id", user.id);

    if (sharesError) {
      console.error(sharesError);
      return;
    }

    const sharedIds = (shares || []).map((share) => share.plant_id);

    let sharedPlants: Plant[] = [];

    if (sharedIds.length > 0) {
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .in("id", sharedIds);

      if (error) {
        console.error(error);
      } else {
        sharedPlants = data || [];
      }
    }

    const allPlants = [...(ownedPlants || []), ...sharedPlants];
    setPlants(allPlants);
  };

  useEffect(() => {
  const initPage = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    fetchPlants();
  };

  initPage();
}, []);

  const handleWaterPlant = async (plantId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Tu dois être connecté");
      return;
    }

    const now = new Date().toISOString();

    const { error: logError } = await supabase.from("watering_logs").insert({
      plant_id: plantId,
      user_id: user.id,
      watered_at: now,
    });

    if (logError) {
      alert(logError.message);
      return;
    }

    const { error: plantError } = await supabase
      .from("plants")
      .update({ last_watered_at: now })
      .eq("id", plantId);

    if (plantError) {
      alert(plantError.message);
      return;
    }

    fetchPlants();
  };

  const needsWater = (plant: Plant) => {
    if (!plant.last_watered_at) return true;

    const last = new Date(plant.last_watered_at);
    const now = new Date();

    const diffDays =
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

    return diffDays >= plant.watering_frequency_days;
  };

  const getNextWateringDate = (plant: Plant) => {
    if (!plant.last_watered_at) return "À arroser";

    const last = new Date(plant.last_watered_at);
    last.setDate(last.getDate() + plant.watering_frequency_days);

    return last.toLocaleDateString();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-green-700">
              Suivi d’arrosage
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              Mes plantes 🌱
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Suis tes arrosages, vois les prochaines dates et partage tes
              plantes facilement.
            </p>
          </div>

          <Link
            href="/plants/new"
            className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            + Ajouter une plante
          </Link>
        </header>

        {plants.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              🌿
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Aucune plante pour le moment
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Commence par ajouter ta première plante.
            </p>

            <Link
              href="/plants/new"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Créer ma première plante
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {plants.map((plant) => {
              const isUrgent = needsWater(plant);

              return (
                <div
                  key={plant.id}
                  className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/plants/${plant.id}`}
                        className="text-xl font-semibold text-gray-900 hover:text-green-700"
                      >
                        {plant.name}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        Tous les {plant.watering_frequency_days} jours
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isUrgent
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {isUrgent ? "À arroser" : "OK"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Dernier arrosage
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {plant.last_watered_at
                          ? new Date(plant.last_watered_at).toLocaleString()
                          : "Jamais"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Prochain arrosage
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {getNextWateringDate(plant)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleWaterPlant(plant.id)}
                    className="mt-5 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    J’ai arrosé 💧
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}