"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import RefreshWeatherButton from "@/components/plants/RefreshWeatherButton";
import {
  getPlantDisplayName,
  getPlantIdentitySubtitle,
  getConfidenceLabel,
  type PlantIdentificationOption,
} from "@/lib/plants/identity";
import { uploadPlantImage } from "@/lib/plants/images";
import {
  getAdaptiveWateringInsight,
  getHealthInsight,
  getWeatherInsight,
} from "@/lib/plants/insights";
import { supabase } from "@/lib/supabase";
import type { Plant, PlantNote, PlantShare, WateringLog } from "@/lib/types";

type PlantForm = {
  customName: string;
  city: string;
  exposure: string;
  frequency: number;
  rain: boolean;
};

type PlantNotesForm = {
  repottedAt: string;
  leafStatus: string;
  fertilizerAddedAt: string;
};

type PlantUpdatePayload = Pick<
  Plant,
  | "name"
  | "custom_name"
  | "identified_name"
  | "scientific_name"
  | "identification_confidence"
  | "identification_options"
  | "city"
  | "exposure"
  | "watering_frequency_days"
  | "can_be_watered_by_rain"
  | "latitude"
  | "longitude"
  | "weather_advice"
  | "weather_score"
  | "weather_updated_at"
>;

const EMPTY_NOTES: PlantNotesForm = {
  repottedAt: "",
  leafStatus: "",
  fertilizerAddedAt: "",
};

type PageMessage = {
  type: "success" | "error";
  text: string;
};

type ConfirmState =
  | { kind: "delete-plant" }
  | { kind: "remove-image" }
  | { kind: "delete-log"; logId: string }
  | { kind: "remove-share"; email: string }
  | null;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeFrequency(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(30, Math.max(1, Math.round(value)));
}

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

function mapNotes(note: PlantNote | null): PlantNotesForm {
  if (!note) return EMPTY_NOTES;

  return {
    repottedAt: note.repotted_at || "",
    leafStatus: note.leaf_status || "",
    fertilizerAddedAt: note.fertilizer_added_at || "",
  };
}

export default function PlantDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const plantId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [history, setHistory] = useState<WateringLog[]>([]);
  const [sharedWith, setSharedWith] = useState<PlantShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareEmail, setShareEmail] = useState("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogDate, setEditingLogDate] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [updatingImage, setUpdatingImage] = useState(false);
  const [savingPlant, setSavingPlant] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesAvailable, setNotesAvailable] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [notes, setNotes] = useState<PlantNotesForm>(EMPTY_NOTES);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [selectedIdentification, setSelectedIdentification] =
    useState<PlantIdentificationOption | null>(null);

  const [form, setForm] = useState<PlantForm>({
    customName: "",
    city: "",
    exposure: "mi-ombre",
    frequency: 3,
    rain: false,
  });

  useEffect(() => {
    if (!newImageFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(newImageFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [newImageFile]);

  const loadData = useCallback(async () => {
    if (!plantId) return;

    setLoading(true);

    const [
      { data: plantDataRaw },
      { data: historyDataRaw },
      { data: sharesDataRaw },
      notesResult,
    ] = await Promise.all([
      supabase.from("plants").select("*").eq("id", plantId).single(),
      supabase
        .from("watering_logs")
        .select("*")
        .eq("plant_id", plantId)
        .order("watered_at", { ascending: false }),
      supabase.from("plant_shares").select("plant_id, user_email").eq("plant_id", plantId),
      supabase.from("plant_notes").select("*").eq("plant_id", plantId).maybeSingle(),
    ]);

    const plantData = plantDataRaw as Plant | null;
    const historyData = (historyDataRaw || []) as WateringLog[];
    const sharesData = (sharesDataRaw || []) as PlantShare[];

    if (!plantData) {
      router.push("/");
      return;
    }

    setPlant(plantData);
    setHistory(historyData);
    setSharedWith(sharesData);
    setForm({
      customName: plantData.custom_name || "",
      city: plantData.city || "",
      exposure: plantData.exposure || "mi-ombre",
      frequency: plantData.watering_frequency_days || 3,
      rain: Boolean(plantData.can_be_watered_by_rain),
    });
    setSelectedIdentification(
      plantData.identified_name
        ? {
            common_name: plantData.identified_name,
            scientific_name: plantData.scientific_name || "",
            confidence: plantData.identification_confidence ?? 0,
            reason: "Identification enregistree pour cette plante.",
          }
        : null
    );

    if (notesResult.error) {
      setNotesAvailable(false);
      setNotes(EMPTY_NOTES);
    } else {
      setNotesAvailable(true);
      setNotes(mapNotes((notesResult.data || null) as PlantNote | null));
    }

    setLoading(false);
  }, [plantId, router]);

  useEffect(() => {
    if (!plantId) return;
    void loadData();
  }, [plantId, loadData]);

  const saveNotes = async () => {
    if (!plantId || !notesAvailable) return;

    try {
      setSavingNotes(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("plant_notes").upsert(
        {
          plant_id: plantId,
          repotted_at: notes.repottedAt || null,
          leaf_status: notes.leafStatus.trim() || null,
          fertilizer_added_at: notes.fertilizerAddedAt || null,
          updated_by: user?.id ?? null,
        },
        { onConflict: "plant_id" }
      );

      if (error) {
        throw error;
      }

      await loadData();
      setMessage({
        type: "success",
        text: "Notes enregistrees. Tu retrouveras ce suivi a chaque visite.",
      });
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Impossible de sauvegarder les notes"),
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const refreshWeather = async () => {
    if (!plantId) return;

    try {
      setWeatherRefreshing(true);
      setMessage(null);

      const res = await fetch("/api/weather/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plantId }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Impossible de rafraichir la meteo");
      }

      await loadData();
      router.refresh();
      setMessage({
        type: "success",
        text: "Meteo actualisee. Les conseils affichent maintenant les dernieres donnees.",
      });
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Erreur lors de l'actualisation meteo"),
      });
    } finally {
      setWeatherRefreshing(false);
    }
  };

  const uploadNewImage = async () => {
    if (!newImageFile || !plantId) return;

    setUpdatingImage(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const imageUrl = await uploadPlantImage(newImageFile, user.id);

      await supabase
        .from("plants")
        .update({ image_url: imageUrl })
        .eq("id", plantId);

      setNewImageFile(null);
      await loadData();
      setMessage({
        type: "success",
        text: "Photo mise a jour. La plante est maintenant plus facile a reconnaitre.",
      });
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Erreur lors de la mise a jour de l'image"),
      });
    } finally {
      setUpdatingImage(false);
    }
  };

  const removeImage = async () => {
    if (!plantId) return;

    setMessage(null);
    try {
      await supabase.from("plants").update({ image_url: null }).eq("id", plantId);
      await loadData();
      setMessage({
        type: "success",
        text: "Photo retiree.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Impossible de retirer la photo pour le moment. Reessaie dans quelques instants.",
      });
    }
  };

  const handleUpdatePlant = async () => {
    if (!plantId) return;

    try {
      setSavingPlant(true);
      setMessage(null);

      if (!form.city.trim()) {
        setMessage({
          type: "error",
          text: "La ville est obligatoire pour conserver les conseils meteo.",
        });
        return;
      }

      const trimmedCity = form.city.trim();
      const previousCity = (plant?.city || "").trim();
      const cityChanged = trimmedCity !== previousCity;
      const safeFrequency = normalizeFrequency(form.frequency);
      const resolvedDisplayName =
        form.customName.trim() || selectedIdentification?.common_name || plant?.name || "Plante";

      const updatePayload: PlantUpdatePayload = {
        name: resolvedDisplayName,
        custom_name: form.customName.trim() || null,
        identified_name: selectedIdentification?.common_name || plant?.identified_name || null,
        scientific_name:
          selectedIdentification?.scientific_name || plant?.scientific_name || null,
        identification_confidence:
          selectedIdentification?.confidence ?? plant?.identification_confidence ?? null,
        identification_options: [],
        city: trimmedCity,
        exposure: form.exposure,
        watering_frequency_days: safeFrequency,
        can_be_watered_by_rain: form.rain,
        latitude: plant?.latitude ?? null,
        longitude: plant?.longitude ?? null,
        weather_advice: plant?.weather_advice ?? null,
        weather_score: plant?.weather_score ?? null,
        weather_updated_at: plant?.weather_updated_at ?? null,
      };

      if (cityChanged) {
        updatePayload.latitude = null;
        updatePayload.longitude = null;
        updatePayload.weather_advice = null;
        updatePayload.weather_score = null;
        updatePayload.weather_updated_at = null;
      }

      const { error } = await supabase
        .from("plants")
        .update(updatePayload)
        .eq("id", plantId);

      if (error) {
        throw error;
      }

      if (cityChanged && trimmedCity) {
        await refreshWeather();
      } else {
        await loadData();
        setMessage({
          type: "success",
          text: "Fiche plante mise a jour.",
        });
      }
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Erreur lors de la mise a jour"),
      });
    } finally {
      setSavingPlant(false);
    }
  };

  const handleDeletePlant = async () => {
    if (!plantId) return;

    try {
      await supabase.from("plants").delete().eq("id", plantId);
      router.push("/");
    } catch {
      setMessage({
        type: "error",
        text: "Impossible de supprimer cette plante pour le moment. Reessaie plus tard.",
      });
    }
  };

  const handleWater = async () => {
    if (!plantId) return;

    setMessage(null);
    try {
      const now = new Date().toISOString();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("plants").update({ last_watered_at: now }).eq("id", plantId);
      await supabase.from("watering_logs").insert({
        plant_id: plantId,
        watered_at: now,
        user_id: user?.id,
      });

      await loadData();
      setMessage({
        type: "success",
        text: "Arrosage enregistre. Le prochain rappel repart de maintenant.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Impossible d'enregistrer l'arrosage. Verifie ta connexion puis reessaie.",
      });
    }
  };

  const handleDeleteLog = async (logId: string) => {
    setMessage(null);
    try {
      await supabase.from("watering_logs").delete().eq("id", logId);
      await loadData();
      setMessage({
        type: "success",
        text: "Entree d'historique supprimee.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Impossible de supprimer cette entree d'historique pour le moment.",
      });
    }
  };

  const startEditLog = (log: WateringLog) => {
    setEditingLogId(log.id);
    setEditingLogDate(toDatetimeLocalValue(log.watered_at));
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setEditingLogDate("");
  };

  const handleUpdateLog = async () => {
    if (!editingLogId || !editingLogDate || !plantId) return;

    setMessage(null);
    try {
      const isoDate = new Date(editingLogDate).toISOString();

      await supabase
        .from("watering_logs")
        .update({ watered_at: isoDate })
        .eq("id", editingLogId);

      if (history.length > 0) {
        const sortedDates = history
          .map((log) => (log.id === editingLogId ? isoDate : log.watered_at))
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        if (sortedDates[0]) {
          await supabase
            .from("plants")
            .update({ last_watered_at: sortedDates[0] })
            .eq("id", plantId);
        }
      }

      cancelEditLog();
      await loadData();
      setMessage({
        type: "success",
        text: "Historique mis a jour.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Impossible de mettre a jour l'historique. Reessaie dans un instant.",
      });
    }
  };

  const handleShare = async () => {
    if (!plantId || !shareEmail.trim()) return;

    const normalizedEmail = shareEmail.trim().toLowerCase();
    setMessage(null);

    if (!normalizedEmail.includes("@")) {
      setMessage({
        type: "error",
        text: "Ajoute une adresse email valide pour partager cette plante.",
      });
      return;
    }

    const { error } = await supabase.from("plant_shares").insert({
      plant_id: plantId,
      user_email: normalizedEmail,
    });

    if (!error) {
      setShareEmail("");
      await loadData();
      setMessage({
        type: "success",
        text: "Acces partage ajoute.",
      });
      return;
    }

    setMessage({
      type: "error",
      text: getErrorMessage(error, "Impossible d'ajouter ce partage"),
    });
  };

  const handleRemoveShare = async (email: string) => {
    if (!plantId) return;

    setMessage(null);
    try {
      await supabase
        .from("plant_shares")
        .delete()
        .eq("plant_id", plantId)
        .eq("user_email", email);

      await loadData();
      setMessage({
        type: "success",
        text: "Acces retire.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Impossible de retirer cet acces pour le moment.",
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;

    try {
      setConfirmBusy(true);

      if (confirmState.kind === "delete-plant") {
        await handleDeletePlant();
      }

      if (confirmState.kind === "remove-image") {
        await removeImage();
      }

      if (confirmState.kind === "delete-log") {
        await handleDeleteLog(confirmState.logId);
      }

      if (confirmState.kind === "remove-share") {
        await handleRemoveShare(confirmState.email);
      }
    } finally {
      setConfirmBusy(false);
      setConfirmState(null);
    }
  };

  const getConfirmContent = () => {
    if (!confirmState) return null;

    if (confirmState.kind === "delete-plant") {
      return {
        title: "Supprimer cette plante ?",
        description:
          "La fiche, l'historique et les informations associees seront retires. Cette action est definitive.",
        confirmLabel: "Supprimer la plante",
      };
    }

    if (confirmState.kind === "remove-image") {
      return {
        title: "Retirer la photo ?",
        description:
          "La plante restera dans ton suivi, mais elle n'aura plus d'image pour l'identifier rapidement.",
        confirmLabel: "Retirer la photo",
      };
    }

    if (confirmState.kind === "delete-log") {
      return {
        title: "Supprimer cet arrosage ?",
        description:
          "Cette entree disparaitra de l'historique et peut modifier le prochain rappel d'arrosage.",
        confirmLabel: "Supprimer l'entree",
      };
    }

    return {
      title: "Retirer cet acces ?",
      description:
        "Cette personne ne pourra plus consulter cette plante tant que tu ne la repartages pas.",
      confirmLabel: "Retirer l'acces",
    };
  };

  const toDatetimeLocalValue = (dateString: string) => {
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const formatFullDate = (date?: string | null) => {
    if (!date) return "Jamais";

    return new Date(date).toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isWeatherStale = (weatherUpdatedAt?: string | null) => {
    if (!weatherUpdatedAt) return true;

    const updatedAt = new Date(weatherUpdatedAt).getTime();
    const maxAge = 24 * 60 * 60 * 1000;
    return Date.now() - updatedAt > maxAge;
  };

  if (loading) {
    return (
      <main className="page-shell">
        <div className="page-container-narrow">
          <div className="glass-card center-empty">
            <p className="hero-title" style={{ fontSize: "2rem" }}>
              Chargement...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!plant) {
    return (
      <main className="page-shell">
        <div className="page-container-narrow">
          <div className="glass-card center-empty">
            <p className="section-title">Plante introuvable</p>
          </div>
        </div>
      </main>
    );
  }

  const weatherInsight = getWeatherInsight(plant);
  const healthInsight = getHealthInsight(plant);
  const adaptiveInsight = getAdaptiveWateringInsight(plant);
  const recommendedRange = `${adaptiveInsight.minDays}${
    adaptiveInsight.maxDays !== adaptiveInsight.minDays
      ? ` a ${adaptiveInsight.maxDays}`
      : ""
  } jours`;
  const confirmContent = getConfirmContent();
  const identitySubtitle = getPlantIdentitySubtitle(plant);

  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="btn-secondary">
            Retour
          </Link>

          <button onClick={handleWater} className="btn-primary">
            Marquer comme arrosee
          </button>
        </div>

        <section className="glass-card mb-6 p-6 md:p-8">
          <div className="mb-8">
            <p className="eyebrow mb-3">Fiche plante</p>
            <h1 className="hero-title" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}>
              {getPlantDisplayName(plant)}
            </h1>
            {identitySubtitle && (
              <p className="mt-3 text-base font-semibold text-[#5c6c5f]">{identitySubtitle}</p>
            )}
            <p className="subtle-text mt-4">
              Dernier arrosage : <strong>{formatFullDate(plant.last_watered_at)}</strong>
            </p>
          </div>

          <div className="mb-6 rounded-[28px] border border-[rgba(35,75,52,0.08)] bg-[#f7faf7] p-5">
            <p className="eyebrow mb-2">Action recommandee</p>
            <p className="text-lg font-black text-[#183624]">{weatherInsight.label}</p>
            <p className="mt-2 text-sm font-semibold text-[#425345]">
              {weatherInsight.detail} Rythme conseille actuellement: {recommendedRange}.
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 rounded-[24px] px-5 py-4 text-sm font-semibold ${
                message.type === "success"
                  ? "border border-emerald-100 bg-emerald-50 text-emerald-900"
                  : "border border-red-100 bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <div className={`rounded-[28px] px-5 py-5 ${toneClasses(weatherInsight.tone)}`}>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em]">Meteo</p>
              <p className="text-lg font-black">{weatherInsight.label}</p>
              <p className="mt-2 text-sm font-semibold">{weatherInsight.detail}</p>
            </div>

            <div className={`rounded-[28px] px-5 py-5 ${toneClasses(healthInsight.tone)}`}>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em]">Sante</p>
              <p className="text-lg font-black">{healthInsight.label}</p>
              <p className="mt-2 text-sm font-semibold">{healthInsight.detail}</p>
            </div>

            <div className="rounded-[28px] border border-[rgba(35,75,52,0.08)] bg-white/85 px-5 py-5">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#6c7d70]">
                Arrosage adaptatif
              </p>
              <p className="text-lg font-black text-[#183624]">{adaptiveInsight.label}</p>
              <p className="mt-2 text-sm font-semibold text-[#425345]">
                Intervalle recommande : {recommendedRange}
              </p>
            </div>
          </div>

          <div className="mb-8">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Nouvelle photo"
                width={1200}
                height={600}
                unoptimized
                className="mb-4 h-[300px] w-full rounded-[28px] object-cover"
              />
            ) : plant.image_url ? (
              <Image
                src={plant.image_url}
                alt={plant.name}
                width={1200}
                height={600}
                className="mb-4 h-[300px] w-full rounded-[28px] object-cover"
              />
            ) : (
              <div className="soft-card mb-4 flex h-[300px] items-center justify-center rounded-[28px] subtle-text">
                Pas encore de photo
              </div>
            )}

            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setNewImageFile(event.target.files?.[0] || null)}
                className="input-elegant"
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={uploadNewImage}
                  disabled={!newImageFile || updatingImage}
                  className="btn-primary"
                >
                  {updatingImage ? "Upload..." : "Mettre a jour la photo"}
                </button>

                {plant.image_url && (
                  <button
                    onClick={() => setConfirmState({ kind: "remove-image" })}
                    className="btn-secondary"
                  >
                    Retirer la photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="soft-card mb-8 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow mb-2">Meteo intelligente</p>
                <h2 className="section-title !mb-0">Conseil meteo</h2>
              </div>

              <div className="flex items-center gap-3">
                <RefreshWeatherButton
                  plantId={plant.id}
                  onSuccess={() =>
                    setMessage({
                      type: "success",
                      text: "Meteo actualisee. Les conseils affichent maintenant les dernieres donnees.",
                    })
                  }
                  onError={(errorMessage) =>
                    setMessage({
                      type: "error",
                      text: errorMessage,
                    })
                  }
                />
                {weatherRefreshing && (
                  <span className="text-sm subtle-text">Actualisation...</span>
                )}
              </div>
            </div>

            {plant.weather_advice ? (
              <div className="space-y-2">
                <p className="text-[1rem] font-semibold text-[#183624]">
                  {plant.weather_advice}
                </p>

                {plant.weather_updated_at && (
                  <p className="subtle-text text-sm">
                    Mis a jour le {formatFullDate(plant.weather_updated_at)}
                  </p>
                )}

                {isWeatherStale(plant.weather_updated_at) && (
                  <p className="text-sm font-semibold text-amber-700">
                    Les donnees meteo ne sont plus a jour. Lance une actualisation pour eviter une mauvaise decision.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="subtle-text">
                  Aucun conseil meteo disponible pour le moment.
                </p>
                <p className="text-sm font-semibold text-amber-700">
                  Ajoute une ville correcte puis actualise la meteo.
                </p>
              </div>
            )}
          </div>

          <div className="mb-6 grid-elegant-2">
            <div className="field">
              <label className="field-label">Nom personnel optionnel</label>
              <input
                type="text"
                value={form.customName}
                onChange={(event) => setForm({ ...form, customName: event.target.value })}
                className="input-elegant"
                placeholder="Ex: La grande du salon"
              />
            </div>

            <div className="field">
              <label className="field-label">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                className="input-elegant"
                placeholder="Ville"
              />
            </div>

            <div className="field">
              <label className="field-label">Exposition lumineuse</label>
              <select
                value={form.exposure}
                onChange={(event) => setForm({ ...form, exposure: event.target.value })}
                className="select-elegant"
              >
                <option value="soleil">Plein soleil</option>
                <option value="mi-ombre">Mi-ombre</option>
                <option value="ombre">Ombre</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Frequence d&apos;arrosage (jours)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.frequency}
                onChange={(event) =>
                  setForm({ ...form, frequency: Number(event.target.value) })
                }
                className="input-elegant"
              />
              <p className="subtle-text text-sm">
                Valeur automatiquement gardee entre 1 et 30 jours pour eviter les erreurs.
              </p>
            </div>
          </div>

          {plant.identified_name && (
            <div className="soft-card mb-6 p-5">
              <p className="eyebrow mb-3">Identification</p>
              <div className="space-y-3">
                {selectedIdentification && (
                  <div className="identification-hero">
                    <p className="identification-hero-title">
                      {selectedIdentification.common_name}
                    </p>
                    <p className="subtle-text text-sm italic">
                      {selectedIdentification.scientific_name || "Nom scientifique non renseigne"}
                    </p>
                    {selectedIdentification.confidence > 0 && (
                      <p className="mt-3 text-sm font-semibold text-[#425345]">
                        Confiance actuelle: {selectedIdentification.confidence}% (
                        {getConfidenceLabel(selectedIdentification.confidence).toLowerCase()})
                      </p>
                    )}
                    <p className="subtle-text mt-2 text-sm">
                      Cette identification est la seule conservee pour cette plante.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="checkbox-row mb-6">
            <input
              type="checkbox"
              checked={form.rain}
              onChange={(event) => setForm({ ...form, rain: event.target.checked })}
              className="checkbox-elegant"
            />
            <div>
              <p className="text-[0.95rem] font-extrabold text-[#183624]">
                Arrosage par la pluie
              </p>
              <p className="subtle-text text-sm">
                Active le suivi pluie pour cette plante.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleUpdatePlant}
              disabled={savingPlant}
              className="btn-primary"
            >
              {savingPlant ? "Sauvegarde..." : "Enregistrer les reglages"}
            </button>

            <button
              onClick={() => setConfirmState({ kind: "delete-plant" })}
              className="btn-danger"
            >
              Supprimer la plante
            </button>
          </div>
        </section>

        <section className="soft-card mb-6 p-6 md:p-8">
          <p className="eyebrow mb-3">Notes</p>
          <h2 className="section-title mb-5">Suivi pratique de la plante</h2>

          {notesAvailable ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field">
                  <label className="field-label">Rempotee le</label>
                  <input
                    type="date"
                    value={notes.repottedAt}
                    onChange={(event) =>
                      setNotes({ ...notes, repottedAt: event.target.value })
                    }
                    className="input-elegant"
                  />
                </div>

                <div className="field">
                  <label className="field-label">Engrais ajoute le</label>
                  <input
                    type="date"
                    value={notes.fertilizerAddedAt}
                    onChange={(event) =>
                      setNotes({ ...notes, fertilizerAddedAt: event.target.value })
                    }
                    className="input-elegant"
                  />
                </div>
              </div>

              <div className="field mt-4">
                <label className="field-label">Observation feuilles</label>
                <textarea
                  value={notes.leafStatus}
                  onChange={(event) =>
                    setNotes({ ...notes, leafStatus: event.target.value })
                  }
                  className="textarea-elegant"
                  placeholder="Ex: feuilles jaunes, nouvelles pousses, terre tres seche..."
                />
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-sm subtle-text">
                  Note ici les infos utiles pour ne plus hesiter au prochain controle.
                </p>
                <button onClick={saveNotes} className="btn-secondary">
                  {savingNotes ? "Sauvegarde..." : "Enregistrer les notes"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
              Les notes ne sont pas encore disponibles. Applique la migration SQL
              ajoutee dans le repo pour activer cette fonction.
            </div>
          )}
        </section>

        <section className="soft-card mb-6 p-6 md:p-8">
          <p className="eyebrow mb-3">Partage</p>
          <h2 className="section-title mb-5">Acces et collaboration</h2>

          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <input
              type="email"
              placeholder="ami@mail.com"
              value={shareEmail}
              onChange={(event) => setShareEmail(event.target.value)}
              className="input-elegant"
            />
            <button onClick={handleShare} className="btn-secondary whitespace-nowrap">
              Inviter un proche
            </button>
          </div>

          <div className="space-y-3">
            {sharedWith.length === 0 ? (
              <div className="rounded-[24px] border border-[rgba(35,75,52,0.08)] bg-white/80 px-5 py-4 text-sm font-semibold text-[#4e6052]">
                Aucun acces partage pour le moment.
              </div>
            ) : (
              sharedWith.map((share) => (
                <div key={share.user_email} className="history-item">
                  <div>
                    <p className="font-extrabold text-[#183624]">{share.user_email}</p>
                    <p className="history-date">Acces collaboratif actif</p>
                  </div>

                  <button
                    onClick={() =>
                      setConfirmState({ kind: "remove-share", email: share.user_email })
                    }
                    className="btn-secondary"
                  >
                    Retirer l&apos;acces
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="soft-card p-6 md:p-8">
          <p className="eyebrow mb-3">Historique</p>
          <h2 className="section-title mb-6">Gestion des arrosages</h2>
          <p className="subtle-text mb-5 text-sm">
            Modifie une date seulement si tu veux corriger l&apos;historique. La derniere date pilote le prochain rappel.
          </p>

          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="center-empty soft-card">
                Aucun arrosage enregistre pour le moment.
              </div>
            ) : (
              history.map((log) => (
                <div key={log.id} className="history-item">
                  {editingLogId === log.id ? (
                    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
                      <input
                        type="datetime-local"
                        value={editingLogDate}
                        onChange={(event) => setEditingLogDate(event.target.value)}
                        className="input-elegant"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleUpdateLog} className="btn-primary">
                          Sauver
                        </button>
                        <button onClick={cancelEditLog} className="btn-secondary">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-extrabold text-[#183624]">Arrosage</p>
                        <p className="history-date">{formatFullDate(log.watered_at)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditLog(log)}
                          className="btn-secondary"
                          title="Modifier"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() =>
                            setConfirmState({ kind: "delete-log", logId: log.id })
                          }
                          className="btn-secondary"
                          title="Supprimer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {confirmContent && (
        <ConfirmModal
          open={Boolean(confirmState)}
          title={confirmContent.title}
          description={confirmContent.description}
          confirmLabel={confirmContent.confirmLabel}
          busy={confirmBusy}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => void handleConfirmAction()}
        />
      )}
    </main>
  );
}
