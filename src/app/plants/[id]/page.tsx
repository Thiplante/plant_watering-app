// src/app/plants/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

export default function PlantDetailPage() {
  const params = useParams();
  const plantId = params.id as string;
  const router = useRouter();

  const [plant, setPlant] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareEmail, setShareEmail] = useState("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogDate, setEditingLogDate] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [updatingImage, setUpdatingImage] = useState(false);

  const [form, setForm] = useState({
    name: "",
    city: "",
    exposure: "mi-ombre",
    frequency: 3,
    rain: false,
  });

  useEffect(() => {
    if (plantId) {
      loadData();
    }
  }, [plantId]);

  const previewUrl = useMemo(() => {
    if (!newImageFile) return "";
    return URL.createObjectURL(newImageFile);
  }, [newImageFile]);

  const loadData = async () => {
    setLoading(true);

    const { data: pData } = await supabase
      .from("plants")
      .select("*")
      .eq("id", plantId)
      .single();

    const { data: hData } = await supabase
      .from("watering_logs")
      .select("*")
      .eq("plant_id", plantId)
      .order("watered_at", { ascending: false });

    if (!pData) {
      router.push("/");
      return;
    }

    setPlant(pData);
    setHistory(hData || []);
    setForm({
      name: pData.name || "",
      city: pData.city || "",
      exposure: pData.exposure || "mi-ombre",
      frequency: pData.watering_frequency_days || 3,
      rain: !!pData.can_be_watered_by_rain,
    });

    setLoading(false);
  };

  const uploadNewImage = async () => {
    if (!newImageFile) return;

    setUpdatingImage(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const fileExt = newImageFile.name.split(".").pop() || "png";
      const fileName = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("plant-images")
        .upload(fileName, newImageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        alert(uploadError.message);
        setUpdatingImage(false);
        return;
      }

      const { data } = supabase.storage.from("plant-images").getPublicUrl(fileName);

      await supabase
        .from("plants")
        .update({ image_url: data.publicUrl })
        .eq("id", plantId);

      setNewImageFile(null);
      await loadData();
      setUpdatingImage(false);
    } catch (error: any) {
      alert(error.message);
      setUpdatingImage(false);
    }
  };

  const removeImage = async () => {
    await supabase.from("plants").update({ image_url: null }).eq("id", plantId);
    loadData();
  };

  const handleUpdatePlant = async () => {
    await supabase
      .from("plants")
      .update({
        name: form.name.trim(),
        city: form.city.trim(),
        exposure: form.exposure,
        watering_frequency_days: form.frequency,
        can_be_watered_by_rain: form.rain,
      })
      .eq("id", plantId);

    loadData();
  };

  const handleDeletePlant = async () => {
    if (!confirm("Supprimer cette plante ?")) return;

    await supabase.from("plants").delete().eq("id", plantId);
    router.push("/");
  };

  const handleWater = async () => {
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

    loadData();
  };

  const handleDeleteLog = async (logId: string) => {
    await supabase.from("watering_logs").delete().eq("id", logId);
    loadData();
  };

  const startEditLog = (log: any) => {
    setEditingLogId(log.id);
    setEditingLogDate(toDatetimeLocalValue(log.watered_at));
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setEditingLogDate("");
  };

  const handleUpdateLog = async () => {
    if (!editingLogId || !editingLogDate) return;

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
    loadData();
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) return;

    const { error } = await supabase.from("plant_shares").insert({
      plant_id: plantId,
      user_email: shareEmail.trim().toLowerCase(),
    });

    if (!error) {
      setShareEmail("");
    }
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

  if (loading) {
    return (
      <main className="page-shell">
        <div className="page-container-narrow">
          <div className="center-empty glass-card">
            <p className="hero-title" style={{ fontSize: "2rem" }}>
              🌿 Chargement...
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
          <div className="center-empty glass-card">
            <p className="section-title">Plante introuvable</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link href="/" className="btn-secondary">
            ← Retour
          </Link>

          <button onClick={handleWater} className="btn-primary">
            💧 Arroser
          </button>
        </div>

        <section className="glass-card p-6 md:p-8 mb-6">
          <div className="mb-8">
            <p className="eyebrow mb-3">Fiche plante</p>
            <h1 className="hero-title" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}>
              {plant.name}
            </h1>
            <p className="subtle-text mt-4">
              Dernier arrosage : <strong>{formatFullDate(plant.last_watered_at)}</strong>
            </p>
          </div>

          <div className="mb-8">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Nouvelle photo"
                className="w-full h-[300px] object-cover rounded-[28px] mb-4"
              />
            ) : plant.image_url ? (
              <img
                src={plant.image_url}
                alt={plant.name}
                className="w-full h-[300px] object-cover rounded-[28px] mb-4"
              />
            ) : (
              <div className="soft-card h-[300px] rounded-[28px] mb-4 flex items-center justify-center subtle-text">
                🌿 Pas encore de photo
              </div>
            )}

            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                className="input-elegant"
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={uploadNewImage}
                  disabled={!newImageFile || updatingImage}
                  className="btn-primary"
                >
                  {updatingImage ? "Upload..." : "Mettre à jour la photo"}
                </button>

                {plant.image_url && (
                  <button onClick={removeImage} className="btn-secondary">
                    Retirer la photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid-elegant-2 mb-6">
            <div className="field">
              <label className="field-label">Nom</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-elegant"
                placeholder="Nom de la plante"
              />
            </div>

            <div className="field">
              <label className="field-label">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input-elegant"
                placeholder="Ville"
              />
            </div>

            <div className="field">
              <label className="field-label">Exposition lumineuse</label>
              <select
                value={form.exposure}
                onChange={(e) => setForm({ ...form, exposure: e.target.value })}
                className="select-elegant"
              >
                <option value="soleil">☀️ Plein soleil</option>
                <option value="mi-ombre">🌤️ Mi-ombre</option>
                <option value="ombre">☁️ Ombre</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Fréquence d’arrosage (jours)</label>
              <input
                type="number"
                min={1}
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: Number(e.target.value) })
                }
                className="input-elegant"
              />
            </div>
          </div>

          <div className="checkbox-row mb-6">
            <input
              type="checkbox"
              checked={form.rain}
              onChange={(e) => setForm({ ...form, rain: e.target.checked })}
              className="checkbox-elegant"
            />
            <div>
              <p className="font-extrabold text-[0.95rem] text-[#183624]">
                🌧️ Arrosage par la pluie
              </p>
              <p className="subtle-text text-sm">
                Active le suivi pluie pour cette plante.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={handleUpdatePlant} className="btn-primary">
              Sauvegarder les modifications
            </button>

            <button onClick={handleDeletePlant} className="btn-danger">
              Supprimer la plante
            </button>
          </div>
        </section>

        <section className="soft-card p-6 md:p-8 mb-6">
          <p className="eyebrow mb-3">Partage</p>
          <h2 className="section-title mb-5">Partager cette plante</h2>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="email"
              placeholder="ami@mail.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="input-elegant"
            />
            <button onClick={handleShare} className="btn-secondary whitespace-nowrap">
              Envoyer le partage
            </button>
          </div>
        </section>

        <section className="soft-card p-6 md:p-8">
          <p className="eyebrow mb-3">Historique</p>
          <h2 className="section-title mb-6">Gestion des arrosages</h2>

          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="center-empty soft-card">
                Aucun arrosage enregistré pour le moment.
              </div>
            ) : (
              history.map((log) => (
                <div key={log.id} className="history-item">
                  {editingLogId === log.id ? (
                    <div className="w-full flex flex-col gap-3 md:flex-row md:items-center">
                      <input
                        type="datetime-local"
                        value={editingLogDate}
                        onChange={(e) => setEditingLogDate(e.target.value)}
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
                        <p className="font-extrabold text-[#183624]">💧 Arrosage</p>
                        <p className="history-date">{formatFullDate(log.watered_at)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditLog(log)}
                          className="icon-action"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="icon-action"
                          title="Supprimer"
                        >
                          🗑️
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
    </main>
  );
}