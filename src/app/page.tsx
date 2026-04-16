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
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erreur lors du chargement des plantes.");
      setLoading(false);
      return;
    }

    setPlants(data || []);
    setLoading(false);
  };

  const handleQuickWater = async (e: React.MouseEvent, plant: any) => {
    e.preventDefault();

    const now = new Date().toISOString();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("plants")
      .update({ last_watered_at: now })
      .eq("id", plant.id);

    if (updateError) {
      alert("Erreur pendant l’arrosage.");
      return;
    }

    const { error: logError } = await supabase.from("watering_logs").insert({
      plant_id: plant.id,
      watered_at: now,
      user_id: session.user.id,
    });

    if (logError) {
      alert("Erreur lors de l’enregistrement de l’historique.");
      return;
    }

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
      next: isOverdue
        ? "RETARD"
        : next.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          }),
      isOverdue,
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4] font-black italic">
        CHARGEMENT...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] p-6 text-black lg:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-center justify-between rounded-[48px] bg-white p-10 shadow-sm">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">
            Ma Jungle ☁️
          </h1>

          <Link
            href="/plants/new"
            className="rounded-3xl bg-green-600 px-10 py-5 font-black text-white shadow-lg transition hover:scale-105"
          >
            + AJOUTER
          </Link>
        </div>

        {plants.length === 0 ? (
          <div className="rounded-[32px] bg-white p-10 text-center shadow-sm">
            <h2 className="mb-2 text-2xl font-black">Aucune plante pour le moment</h2>
            <p className="mb-6 text-gray-500">
              Commence par ajouter ta première plante.
            </p>
            <Link
              href="/plants/new"
              className="inline-block rounded-2xl bg-green-600 px-6 py-3 font-black text-white"
            >
              Ajouter une plante
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {plants.map((plant) => {
              const status = calculateStatus(
                plant.last_watered_at,
                plant.watering_frequency_days
              );

              return (
                <div
                  key={plant.id}
                  className="group relative rounded-[44px] border-2 border-transparent bg-white p-8 shadow-sm transition-all hover:border-green-400"
                >
                  <Link href={`/plants/${plant.id}`}>
                    <h3 className="mb-4 text-3xl font-black tracking-tighter">
                      {plant.name}
                    </h3>

                    <div className="mb-6 flex gap-2 text-[10px] font-black uppercase text-gray-400">
                      <span className="rounded-lg bg-gray-50 px-3 py-1">
                        📍 {plant.city || "Ville inconnue"}
                      </span>
                      <span className="rounded-lg bg-gray-50 px-3 py-1">
                        🔆 {plant.exposure || "Non définie"}
                      </span>
                    </div>

                    <div className="mb-6 space-y-3">
                      <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Dernier
                        </span>
                        <span className="text-sm font-bold text-gray-700">
                          {status.last}
                        </span>
                      </div>

                      <div
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                          status.isOverdue
                            ? "border-red-100 bg-red-50"
                            : "border-green-100 bg-green-50"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-black uppercase ${
                            status.isOverdue ? "text-red-400" : "text-green-400"
                          }`}
                        >
                          Prochain
                        </span>
                        <span
                          className={`text-sm font-black ${
                            status.isOverdue ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {status.next}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={(e) => handleQuickWater(e, plant)}
                    className="w-full rounded-2xl bg-black py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition active:scale-95"
                  >
                    ARROSER 💧
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}