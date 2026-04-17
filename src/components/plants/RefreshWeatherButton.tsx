"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refreshPlantWeather } from "@/lib/weather/actions";

type Props = {
  plantId: string;
};

export default function RefreshWeatherButton({ plantId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    try {
      setLoading(true);
      setError(null);

      await refreshPlantWeather(plantId);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors du rafraichissement meteo"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        className="btn-secondary"
      >
        {loading ? "Actualisation..." : "Actualiser la meteo"}
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
