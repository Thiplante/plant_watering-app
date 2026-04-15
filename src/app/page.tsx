"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);

  // Utilisation de useCallback pour pouvoir rafraîchir la liste facilement
  const fetchPlants = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.replace("/login");
      return;
    }

    // 1. Récupérer mes propres plantes
    const { data: ownedPlants, error: ownedError } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (ownedError) {
      console.error("Erreur plantes possédées:", ownedError);
    }

    // 2. Récupérer les plantes partagées avec moi
    const { data: shares, error: sharesError } = await supabase
      .from("plant_shares")
      .select("plant_id")
      .eq("user_id", user.id);

    let sharedPlants: Plant[] = [];
    if (!sharesError && shares && shares.length > 0) {
      const sharedIds = shares.map((share) => share.plant_id);
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .in("id", sharedIds);
      
      if (!error) sharedPlants = data || [];
    }

    // Combiner et mettre à jour le state
    setPlants([...(ownedPlants || []), ...sharedPlants]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  // --- ACTION : ARROSER LA PLANTE ---
  const handleWaterPlant = async (plantId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date().toISOString();

    // Insertion du log d'arrosage
    const { error: logError } = await supabase.from("watering_logs").insert({
      plant_id: plantId,
      user_id: user.id,
      watered_at: now,
    });

    if (logError) {
      alert("Erreur log : " + logError.message);
      return;
    }

    // Mise à jour de la date sur la plante
    const { data, error: plantError } = await supabase
      .from("plants")
      .update({ last_watered_at: now })
      .eq("id", plantId)
      .select(); // Le select() confirme que la RLS a autorisé l'action

    if (plantError) {
      alert("Erreur mise à jour : " + plantError.message);
    } else if (!data || data.length === 0) {
      alert("Permission refusée pour arroser cette plante.");
    } else {
      // Succès : on recharge la liste pour voir les nouvelles dates
      fetchPlants();
    }
  };

  // --- FONCTIONS DE CALCUL ---
  const needsWater = (plant: Plant) => {
    if (!plant.last_watered_at) return true;
    const last = new Date(plant.last_watered_at);
    const now = new Date();
    const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= plant.watering_frequency_days;
  };

  const getNextWateringDate = (plant: Plant) => {
    if (!plant.last_watered_at) return "À arroser";
    const last = new Date(plant.last_watered_at);
    last.setDate(last.getDate() + plant.watering_frequency_days);
    return last.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50">
        <p className="text-lg font-medium text-green-800 animate-pulse">Chargement de ta jungle...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-green-700">Suivi d’arrosage</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Mes plantes 🌱</h1>
            <p className="mt-2 text-sm text-gray-600">Gère tes arrosages et tes partages.</p>
          </div>
          <Link
            href="/plants/new"
            className="inline-flex items-