"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Plant = {
  id: string;
  name: string;
  watering_frequency_days: number;
  last_watered_at: string | null;
};

type WateringLog = {
  id: string;
  watered_at: string;
  note: string | null;
};

export default function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [logs, setLogs] = useState<WateringLog[]>([]);
  const [plantId, setPlantId] = useState("");
  const [shareEmail, setShareEmail] = useState("");

  const loadData = async (id: string) => {
    const { data: plantData, error: plantError } = await supabase
      .from("plants")
      .select("*")
      .eq("id", id)
      .single();

    if (plantError) {
      console.error(plantError);
      return;
    }

    setPlant(plantData);

    const { data: logsData, error: logsError } = await supabase
      .from("watering_logs")
      .select("*")
      .eq("plant_id", id)
      .order("watered_at", { ascending: false });

    if (logsError) {
      console.error(logsError);
      return;
    }

    setLogs(logsData || []);
  };

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      setPlantId(id);
      await loadData(id);
    };

    init();
  }, [params]);

  const handleWaterPlant = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !plantId) {
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

    await loadData(plantId);
  };

  const handleSharePlant = async () => {
    if (!shareEmail.trim()) {
      alert("Entre un email");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", shareEmail)
      .single();

    if (profileError || !profile) {
      alert("Utilisateur introuvable");
      return;
    }

    const { error: shareError } = await supabase.from("plant_shares").insert({
      plant_id: plantId,
      user_id: profile.id,
      can_edit: true,
    });

    if (shareError) {
      alert(shareError.message);
      return;
    }

    alert("Plante partagée !");
    setShareEmail("");
  };

  const getNextWateringDate = () => {
    if (!plant?.last_watered_at) return "À arroser";

    const last = new Date(plant.last_watered_at);
    last.setDate(last.getDate() + plant.watering_frequency_days);

    return last.toLocaleDateString();
  };

  if (!plant) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
            Chargement...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="text-sm font-medium text-green-700 hover:text-green-800">
            ← Retour à mes plantes
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Détail plante</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
                {plant.name}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Suis l’arrosage et partage cette plante avec quelqu’un.
              </p>
            </div>

            <button
              onClick={handleWaterPlant}
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              J’ai arrosé 💧
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Fréquence
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                Tous les {plant.watering_frequency_days} jours
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Dernier arrosage
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {plant.last_watered_at
                  ? new Date(plant.last_watered_at).toLocaleString()
                  : "Jamais"}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Prochain arrosage
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {getNextWateringDate()}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-gray-50 p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Partager la plante
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Ajoute l’email d’une personne pour qu’elle puisse suivre cette plante.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="email@exemple.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500"
              />

              <button
                onClick={handleSharePlant}
                className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                Partager
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">Historique</h2>
            <p className="mt-1 text-sm text-gray-600">
              Retrouve tous les arrosages enregistrés.
            </p>

            <div className="mt-4 space-y-3">
              {logs.length === 0 && (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  Aucun arrosage enregistré
                </div>
              )}

              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(log.watered_at).toLocaleString()}
                  </p>
                  {log.note && (
                    <p className="mt-1 text-sm text-gray-600">{log.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}