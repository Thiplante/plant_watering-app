"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { refreshPlantWeather } from "@/lib/weather/actions";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type FormErrors = {
  name?: string;
  city?: string;
  frequency?: string;
  submit?: string;
};

function normalizeFrequency(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(30, Math.max(1, Math.round(value)));
}

export default function NewPlantPage() {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState(3);
  const [city, setCity] = useState("");
  const [exposure, setExposure] = useState("mi-ombre");
  const [canBeWateredByRain, setCanBeWateredByRain] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setLoading(false);
    };

    void checkUser();
  }, [router]);

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Ajoute un nom pour reconnaitre la plante d'un coup d'oeil.";
    }

    if (!city.trim()) {
      nextErrors.city = "Ajoute une ville pour activer le conseil meteo.";
    }

    if (!Number.isFinite(frequency) || frequency < 1 || frequency > 30) {
      nextErrors.frequency = "Choisis une frequence entre 1 et 30 jours.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const formSummary = useMemo(() => {
    const trimmedName = name.trim() || "Plante sans nom";
    const trimmedCity = city.trim() || "Ville a renseigner";
    const rainMode = canBeWateredByRain ? "Prend en compte la pluie" : "Arrosage manuel seulement";

    return `${trimmedName}, ${exposure}, tous les ${normalizeFrequency(
      frequency
    )} jours, ${trimmedCity}, ${rainMode}.`;
  }, [canBeWateredByRain, city, exposure, frequency, name]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const safeFrequency = normalizeFrequency(frequency);
      const { data: newPlant, error } = await supabase
        .from("plants")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          watering_frequency_days: safeFrequency,
          city: city.trim(),
          exposure,
          can_be_watered_by_rain: canBeWateredByRain,
          last_watered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!newPlant?.id) {
        throw new Error("La plante a ete creee mais son identifiant est introuvable.");
      }

      try {
        await refreshPlantWeather(newPlant.id);
      } catch (weatherError) {
        console.error("Erreur meteo apres creation :", weatherError);
      }

      router.push(`/plants/${newPlant.id}`);
      router.refresh();
    } catch (error: unknown) {
      setErrors({
        submit: `Impossible de creer la plante: ${getErrorMessage(error, "Inconnue")}`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4]">
        <p className="animate-pulse font-black text-green-800">CHARGEMENT...</p>
      </div>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        <Link
          href="/"
          className="btn-secondary"
        >
          Retour au dashboard
        </Link>

        <div className="glass-card mt-6 p-6 md:p-8">
          <div className="mb-8">
            <p className="eyebrow mb-3">Nouvelle plante</p>
            <h1 className="hero-title" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
              Une creation simple, sans erreur
            </h1>
            <p className="subtle-text mt-4 max-w-2xl text-base">
              Renseigne les 4 infos utiles, et l&apos;application preparera le suivi
              d&apos;arrosage et la meteo pour toi.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-6" noValidate>
            <section className="soft-card p-5 md:p-6">
              <p className="eyebrow mb-4">Essentiel</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field">
                  <label htmlFor="name" className="field-label">
                    Nom de la plante
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Ex: Mon monstera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    className="input-elegant"
                  />
                  <p className={`text-sm ${errors.name ? "text-red-700" : "subtle-text"}`}>
                    {errors.name || "Choisis un nom simple que tu reconnaitras tout de suite."}
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="city" className="field-label">
                    Ville pour la meteo
                  </label>
                  <input
                    id="city"
                    type="text"
                    placeholder="Ex: Bordeaux"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    aria-invalid={Boolean(errors.city)}
                    className="input-elegant"
                  />
                  <p className={`text-sm ${errors.city ? "text-red-700" : "subtle-text"}`}>
                    {errors.city || "La ville permet d&apos;afficher les conseils meteo reels."}
                  </p>
                </div>
              </div>
            </section>

            <section className="soft-card p-5 md:p-6">
              <p className="eyebrow mb-4">Rythme d&apos;arrosage</p>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="field">
                  <label htmlFor="frequency" className="field-label">
                    Frequence d&apos;arrosage
                  </label>
                  <input
                    id="frequency"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    value={frequency}
                    onChange={(e) => setFrequency(Number(e.target.value))}
                    aria-invalid={Boolean(errors.frequency)}
                    className="input-elegant"
                  />
                  <p className={`text-sm ${errors.frequency ? "text-red-700" : "subtle-text"}`}>
                    {errors.frequency ||
                      "Garde une base simple: 3 a 7 jours pour beaucoup de plantes d&apos;interieur."}
                  </p>
                </div>

                <div className="rounded-[28px] border border-[rgba(35,75,52,0.08)] bg-[#f7faf7] p-5">
                  <p className="field-label mb-2">Repere rapide</p>
                  <p className="text-3xl font-black text-[#183624]">
                    {normalizeFrequency(frequency)}
                  </p>
                  <p className="subtle-text mt-2 text-sm">
                    jour{normalizeFrequency(frequency) > 1 ? "s" : ""} entre deux arrosages
                  </p>
                </div>
              </div>
            </section>

            <section className="soft-card p-5 md:p-6">
              <p className="eyebrow mb-4">Contexte de la plante</p>
              <div className="space-y-4">
                <div className="field">
                  <label htmlFor="exposure" className="field-label">
                    Exposition lumineuse
                  </label>
                  <select
                    id="exposure"
                    value={exposure}
                    onChange={(e) => setExposure(e.target.value)}
                    className="select-elegant"
                  >
                    <option value="soleil">Plein soleil</option>
                    <option value="mi-ombre">Mi-ombre</option>
                    <option value="ombre">Ombre</option>
                  </select>
                  <p className="subtle-text text-sm">
                    Ce choix aide l&apos;app a mieux interpréter les conditions de la plante.
                  </p>
                </div>

                <label className="checkbox-row cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canBeWateredByRain}
                    onChange={(e) => setCanBeWateredByRain(e.target.checked)}
                    className="checkbox-elegant"
                  />
                  <div>
                    <p className="text-[0.95rem] font-extrabold text-[#183624]">
                      Cette plante peut profiter de la pluie
                    </p>
                    <p className="subtle-text text-sm">
                      Active cette option si la plante est dehors ou peut vraiment etre arrosee par la pluie.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-[32px] border border-[rgba(35,75,52,0.08)] bg-white/80 p-5 md:p-6">
              <p className="eyebrow mb-3">Resume avant creation</p>
              <p className="text-base font-semibold text-[#183624]">{formSummary}</p>
              <p className="subtle-text mt-3 text-sm">
                La plante sera creee comme arrosee aujourd&apos;hui, puis la meteo sera actualisee automatiquement.
              </p>
            </section>

            {errors.submit && (
              <div className="rounded-[24px] border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
                {errors.submit}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="submit" disabled={saving} className="btn-primary min-w-[240px]">
                {saving ? "Enregistrement..." : "Creer la plante"}
              </button>
              <p className="subtle-text text-sm">
                Tout pourra etre modifie ensuite depuis la fiche plante.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
