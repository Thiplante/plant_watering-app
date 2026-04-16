"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

export default function PlantDetailPage() {
  const params = useParams();
  const plantId = params.id as string;
  const router = useRouter();

  const [plant, setPlant] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (plantId) {
      loadData();
    }
  }, [plantId]);

  const loadData = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { data: pData, error: plantError } = await supabase
      .from("plants")
      .select("*")
      .eq("id", plantId)
      .eq("owner_id", session.user.id)
      .single();

    if (plantError || !pData) {
      router.push("/");
      return;
    }

    setPlant(pData);
    setNewName(pData.name ?? "");

    const { data: hData } = await supabase
      .from("watering_logs")
      .select("*")
      .eq("plant_id", plantId)
      .order("watered_at", { ascending: false });

    setHistory(hData || []);
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!newName.trim()) {
      alert("Le nom ne peut pas être vide.");
      return;
    }

    const { error } = await supabase
      .from("plants")
      .update({ name: newName.trim() })
      .eq("id", plantId);

    if (error) {
      alert("Erreur lors de la mise à jour.");
      return;
    }

    setIsEditing(false);
    loadData();
  };

  const handleWater = async () => {
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
      .eq("id", plantId);

    if (updateError) {
      alert("Erreur pendant l’arrosage.");
      return;
    }

    const { error: logError } = await supabase.from("watering_logs").insert({
      plant_id: plantId,
      watered_at: now,
      user_id: session.user.id,
    });

    if (logError) {
      alert("Erreur lors de l’enregistrement dans l’historique.");
      return;
    }

    loadData();
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cette plante ?")) return;

    const { error } = await supabase.from("plants").delete().eq("id", plantId);

    if (error) {
      alert("Erreur lors de la suppression.");
      return;
    }

    router.push("/");
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      alert("Entre un email.");
      return;
    }

    const { error } = await supabase.from("plant_shares").insert({
      plant_id: plantId,
      user_email: shareEmail.trim().toLowerCase(),
    });

    if (error) {
      alert("Erreur partage : " + error.message);
      return;
    }

    alert("Partagé !");
    setShareEmail("");
  };

  const formatFullDate = (date?: string | null) => {
    if (!date) return "Jamais";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-20 text-center font-black">CHARGEMENT...</div>
    );
  }

  if (!plant) {
    return (
      <div className="p-20 text-center font-black">PLANTE INTROUVABLE</div>
    );
  }

  return (
    <main className="min-h-screen bg-white p-6 text-black md:p-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-black text-gray-400">
            ← RETOUR
          </Link>

          <button
            onClick={handleWater}
            className="rounded-full bg-black px-8 py-3 text-xs font-black uppercase text-white shadow-xl"
          >
            Arroser 💧
          </button>
        </div>

        <div className="mb-12">
          {isEditing ? (
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border-b-4 border-green-500 text-4xl font-black italic outline-none"
              />
              <button
                onClick={handleUpdate}
                className="rounded-xl bg-green-500 px-4 font-black text-white"
              >
                OK
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-black italic tracking-tighter">
                {plant.name}
              </h1>
              <button
                onClick={() => setIsEditing(true)}
                className="text-2xl hover:scale-110"
              >
                🔧
              </button>
            </div>
          )}

          <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-400">
            Dernier : {formatFullDate(plant.last_watered_at)}
          </p>
        </div>

        <div className="mb-8 rounded-[32px] bg-blue-50 p-6">
          <h3 className="mb-3 text-[10px] font-black uppercase">
            Partager avec un ami (Email)
          </h3>

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="ami@mail.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="flex-1 rounded-xl border-none px-4 py-2 text-sm shadow-inner"
            />
            <button
              onClick={handleShare}
              className="rounded-xl bg-blue-600 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white"
            >
              Partager
            </button>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-xl font-black italic underline decoration-green-500">
            Historique
          </h2>

          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-4 text-[11px] font-bold text-gray-400">
                Aucun arrosage enregistré.
              </div>
            ) : (
              history.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between rounded-2xl bg-gray-50 p-4 text-[11px] font-bold"
                >
                  <span>💧 ARROSAGE</span>
                  <span className="text-gray-400">
                    {new Date(log.watered_at).toLocaleDateString("fr-FR")} à{" "}
                    {new Date(log.watered_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-center border-t pt-10">
          <button
            onClick={handleDelete}
            className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300 hover:text-red-600"
          >
            Supprimer la plante
          </button>
        </div>
      </div>
    </main>
  );
}