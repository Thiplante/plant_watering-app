"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import IdentificationOptions from "@/components/plants/IdentificationOptions";
import { supabase } from "@/lib/supabase";
import { uploadPlantImage, readFileAsDataUrl } from "@/lib/plants/images";
import type { PlantIdentificationOption } from "@/lib/plants/identity";
import {
  getCareProfileFromIdentification,
  getDifficultyLabel,
  getPetSafetyLabel,
  getRecommendedWateringDays,
} from "@/lib/plants/profile";
import { refreshPlantWeather } from "@/lib/weather/actions";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type FormErrors = {
  identity?: string;
  city?: string;
  frequency?: string;
  photo?: string;
  submit?: string;
};

function normalizeFrequency(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(30, Math.max(1, Math.round(value)));
}

export default function NewPlantPage() {
  const [customName, setCustomName] = useState("");
  const [frequency, setFrequency] = useState(3);
  const [city, setCity] = useState("");
  const [exposure, setExposure] = useState("mi-ombre");
  const [canBeWateredByRain, setCanBeWateredByRain] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [identificationSummary, setIdentificationSummary] = useState("");
  const [identificationOptions, setIdentificationOptions] = useState<
    PlantIdentificationOption[]
  >([]);
  const [selectedIdentification, setSelectedIdentification] =
    useState<PlantIdentificationOption | null>(null);
  const [showIdentificationOptions, setShowIdentificationOptions] = useState(false);
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

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!customName.trim() && !selectedIdentification) {
      nextErrors.identity =
        "Ajoute un nom personnel ou choisis une plante proposee apres analyse photo.";
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

  const resolvedDisplayName = useMemo(() => {
    return customName.trim() || selectedIdentification?.common_name || "Plante a identifier";
  }, [customName, selectedIdentification]);

  const formSummary = useMemo(() => {
    const trimmedCity = city.trim() || "Ville a renseigner";
    const rainMode = canBeWateredByRain ? "Prend en compte la pluie" : "Arrosage manuel seulement";
    const plantType = selectedIdentification?.scientific_name
      ? `${selectedIdentification.common_name} • ${selectedIdentification.scientific_name}`
      : selectedIdentification?.common_name || "Type non precise";

    return `${resolvedDisplayName}, ${plantType}, ${exposure}, tous les ${normalizeFrequency(
      frequency
    )} jours, ${trimmedCity}, ${rainMode}.`;
  }, [canBeWateredByRain, city, exposure, frequency, resolvedDisplayName, selectedIdentification]);

  const selectedCareProfile = useMemo(
    () => getCareProfileFromIdentification(selectedIdentification),
    [selectedIdentification]
  );

  const handleSelectIdentification = (option: PlantIdentificationOption) => {
    setSelectedIdentification(option);
    setShowIdentificationOptions(false);
    setErrors((current) => ({ ...current, identity: undefined, photo: undefined }));
  };

  const applySuggestedCare = () => {
    if (!selectedCareProfile) return;

    setExposure(selectedCareProfile.exposure);
    setFrequency(getRecommendedWateringDays(selectedCareProfile));
    setCanBeWateredByRain(selectedCareProfile.exposure === "soleil");
  };

  const handleIdentify = async () => {
    if (!imageFile) {
      setErrors((current) => ({
        ...current,
        photo: "Ajoute une photo pour recevoir des propositions de plante.",
      }));
      return;
    }

    try {
      setIdentifying(true);
      setErrors((current) => ({ ...current, photo: undefined, submit: undefined }));

      const imageDataUrl = await readFileAsDataUrl(imageFile);
      const response = await fetch("/api/plants/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageDataUrl }),
      });

      const data = (await response.json()) as {
        error?: string;
        summary?: string;
        suggestions?: PlantIdentificationOption[];
      };

      if (!response.ok || !data.suggestions) {
        throw new Error(data.error || "Impossible d'identifier cette plante");
      }

      setIdentificationSummary(data.summary || "");
      setIdentificationOptions(data.suggestions);
      setSelectedIdentification(null);
      setShowIdentificationOptions(true);
    } catch (error: unknown) {
      setErrors((current) => ({
        ...current,
        photo: getErrorMessage(
          error,
          "Impossible d'identifier la plante a partir de cette photo"
        ),
      }));
    } finally {
      setIdentifying(false);
    }
  };

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

      const imageUrl = imageFile ? await uploadPlantImage(imageFile, user.id) : null;
      const safeFrequency = normalizeFrequency(frequency);
      const chosenIdentification = selectedIdentification;

      const { data: newPlant, error } = await supabase
        .from("plants")
        .insert({
          owner_id: user.id,
          name: resolvedDisplayName,
          custom_name: customName.trim() || null,
          identified_name: chosenIdentification?.common_name || null,
          scientific_name: chosenIdentification?.scientific_name || null,
          identification_confidence: chosenIdentification?.confidence ?? null,
          identification_options: [],
          watering_frequency_days: safeFrequency,
          city: city.trim(),
          exposure,
          can_be_watered_by_rain: canBeWateredByRain,
          last_watered_at: new Date().toISOString(),
          image_url: imageUrl,
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
        <Link href="/" className="btn-secondary">
          Retour au dashboard
        </Link>

        <div className="glass-card mt-6 p-6 md:p-8">
          <div className="mb-8">
            <p className="eyebrow mb-3">Nouvelle plante</p>
            <h1 className="hero-title" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
              Identifie la plante, puis personalise-la
            </h1>
            <p className="subtle-text mt-4 max-w-2xl text-base">
              Une photo peut te proposer plusieurs plantes probables. Une fois la bonne plante
              choisie, les autres suggestions disparaissent, mais tu peux les rouvrir a tout
              moment avec un bouton.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-6" noValidate>
            <section className="soft-card p-5 md:p-6">
              <p className="eyebrow mb-4">Photo et reconnaissance</p>

              <div className="space-y-4">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Apercu de la plante"
                    width={1200}
                    height={720}
                    unoptimized
                    className="h-[240px] w-full rounded-[28px] object-cover"
                  />
                ) : (
                  <div className="soft-card flex h-[220px] items-center justify-center rounded-[28px] subtle-text">
                    Ajoute une photo pour recevoir plusieurs propositions de plante.
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                    className="input-elegant"
                  />
                  <button
                    type="button"
                    onClick={() => void handleIdentify()}
                    disabled={!imageFile || identifying}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {identifying ? "Analyse..." : "Identifier depuis la photo"}
                  </button>
                </div>

                {errors.photo && (
                  <div className="feedback-banner feedback-error">{errors.photo}</div>
                )}

                {identificationOptions.length > 0 && showIdentificationOptions && (
                  <IdentificationOptions
                    summary={identificationSummary}
                    options={identificationOptions}
                    selectedOption={selectedIdentification}
                    onSelect={handleSelectIdentification}
                  />
                )}

                {selectedIdentification && !showIdentificationOptions && (
                  <div className="identification-hero">
                    <p className="field-label mb-2">Identification retenue</p>
                    <p className="identification-hero-title">
                      {selectedIdentification.common_name}
                    </p>
                    <p className="subtle-text text-sm italic">
                      {selectedIdentification.scientific_name || "Nom scientifique non renseigne"}
                    </p>
                    {selectedIdentification.confidence > 0 && (
                      <p className="mt-3 text-sm font-semibold text-[#425345]">
                        Confiance retenue: {selectedIdentification.confidence}%
                      </p>
                    )}
                    <p className="subtle-text mt-2 text-sm">
                      Les autres suggestions ont ete masquees apres ton choix.
                    </p>
                    {identificationOptions.length > 0 && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setShowIdentificationOptions(true)}
                          className="btn-secondary"
                        >
                          Revoir les suggestions IA
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="soft-card p-5 md:p-6">
              <p className="eyebrow mb-4">Identite visible</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field">
                  <label htmlFor="custom-name" className="field-label">
                    Nom personnel optionnel
                  </label>
                  <input
                    id="custom-name"
                    type="text"
                    placeholder="Ex: La grande du salon"
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    aria-invalid={Boolean(errors.identity)}
                    className="input-elegant"
                  />
                  <p className={`text-sm ${errors.identity ? "text-red-700" : "subtle-text"}`}>
                    {errors.identity ||
                      "Si tu ne mets pas de nom personnel, le dashboard utilisera la plante identifiee."}
                  </p>
                </div>

                <div className="rounded-[28px] border border-[rgba(35,75,52,0.08)] bg-[#f7faf7] p-5">
                  <p className="field-label mb-2">Nom affiche sur le dashboard</p>
                  <p className="text-2xl font-black text-[#183624]">{resolvedDisplayName}</p>
                  <p className="subtle-text mt-2 text-sm">
                    {selectedIdentification
                      ? `${selectedIdentification.common_name} • ${selectedIdentification.scientific_name}`
                      : "Ajoute un nom personnel ou analyse une photo pour mieux distinguer la plante."}
                  </p>
                </div>
              </div>

              {selectedIdentification && selectedCareProfile && (
                <div className="care-profile-card mt-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="field-label mb-2">Conseils premium</p>
                      <p className="text-lg font-black text-[#183624]">
                        {selectedCareProfile.headline}
                      </p>
                      <p className="subtle-text mt-2 text-sm">{selectedCareProfile.notes}</p>
                    </div>

                    <button
                      type="button"
                      onClick={applySuggestedCare}
                      className="btn-secondary whitespace-nowrap"
                    >
                      Appliquer les reglages conseilles
                    </button>
                  </div>

                  <div className="pill-row mt-4">
                    <span className="pill">
                      Arrosage {selectedCareProfile.wateringMinDays} a{" "}
                      {selectedCareProfile.wateringMaxDays} jours
                    </span>
                    <span className="pill">{selectedCareProfile.placement}</span>
                    <span className="pill">{selectedCareProfile.humidity}</span>
                    <span className="pill">{getPetSafetyLabel(selectedCareProfile.petSafety)}</span>
                    <span className="pill">{getDifficultyLabel(selectedCareProfile.difficulty)}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="soft-card p-5 md:p-6">
              <p className="eyebrow mb-4">Rythme et contexte</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field">
                  <label htmlFor="city" className="field-label">
                    Ville pour la meteo
                  </label>
                  <input
                    id="city"
                    type="text"
                    placeholder="Ex: Bordeaux"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    aria-invalid={Boolean(errors.city)}
                    className="input-elegant"
                  />
                  <p className={`text-sm ${errors.city ? "text-red-700" : "subtle-text"}`}>
                    {errors.city || "La ville permet d'afficher les conseils meteo reels."}
                  </p>
                </div>

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
                    onChange={(event) => setFrequency(Number(event.target.value))}
                    aria-invalid={Boolean(errors.frequency)}
                    className="input-elegant"
                  />
                  <p className={`text-sm ${errors.frequency ? "text-red-700" : "subtle-text"}`}>
                    {errors.frequency ||
                      "Garde une base simple: 3 a 7 jours pour beaucoup de plantes d'interieur."}
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="exposure" className="field-label">
                    Exposition lumineuse
                  </label>
                  <select
                    id="exposure"
                    value={exposure}
                    onChange={(event) => setExposure(event.target.value)}
                    className="select-elegant"
                  >
                    <option value="soleil">Plein soleil</option>
                    <option value="mi-ombre">Mi-ombre</option>
                    <option value="ombre">Ombre</option>
                  </select>
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

              <label className="checkbox-row mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canBeWateredByRain}
                  onChange={(event) => setCanBeWateredByRain(event.target.checked)}
                  className="checkbox-elegant"
                />
                <div>
                  <p className="text-[0.95rem] font-extrabold text-[#183624]">
                    Cette plante peut profiter de la pluie
                  </p>
                  <p className="subtle-text text-sm">
                    Active cette option si la plante est dehors ou peut vraiment etre arrosee par
                    la pluie.
                  </p>
                </div>
              </label>
            </section>

            <section className="rounded-[32px] border border-[rgba(35,75,52,0.08)] bg-white/80 p-5 md:p-6">
              <p className="eyebrow mb-3">Resume avant creation</p>
              <p className="text-base font-semibold text-[#183624]">{formSummary}</p>
              <p className="subtle-text mt-3 text-sm">
                La plante sera creee comme arrosee aujourd&apos;hui, puis la meteo sera actualisee
                automatiquement.
              </p>
            </section>

            {errors.submit && (
              <div className="feedback-banner feedback-error">{errors.submit}</div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="submit" disabled={saving} className="btn-primary min-w-[240px]">
                {saving ? "Enregistrement..." : "Creer la plante"}
              </button>
              <p className="subtle-text text-sm">
                Tu pourras ensuite changer la photo, le nom personnel et l&apos;identification
                depuis la fiche plante.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
