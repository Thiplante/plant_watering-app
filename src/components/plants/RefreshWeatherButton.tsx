"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refreshPlantWeather } from "@/lib/weather/actions";

type Props = {
  plantId: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export default function RefreshWeatherButton({
  plantId,
  onSuccess,
  onError,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    try {
      setLoading(true);
      setError(null);

      await refreshPlantWeather(plantId);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du rafraichissement meteo";
      setError(message);
      onError?.(message);
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
