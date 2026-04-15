"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewPlantPage() {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.replace("/login");
        return;
      }

      setLoading(false);
    };

    checkUser();
  }, []);

  const handleCreate = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.replace("/login");
      return;
    }

    const { error } = await supabase.from("plants").insert({
      owner_id: user.id,
      name,
      watering_frequency_days: frequency,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Plante créée !");
      window.location.href = "/";
    }
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm font-medium text-green-700 hover:text-green-800"
          >
            ← Retour à mes plantes
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-medium text-green-700">
              Nouvelle plante
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              Ajouter une plante 🌿
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Renseigne son nom et la fréquence d’arrosage.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nom de la plante
              </label>
              <input
                type="text"
                placeholder="Ex. Mon pothos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fréquence d’arrosage (jours)
              </label>
              <input
                type="number"
                min={1}
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:bg-white"
              />
            </div>

            <button
              onClick={handleCreate}
              className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Créer la plante
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}