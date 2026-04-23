import { getAuthenticatedHeaders } from "@/lib/api";

export async function refreshPlantWeather(plantId: string) {
  const res = await fetch("/api/weather/refresh", {
    method: "POST",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ plantId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Impossible de rafraichir la meteo");
  }

  return data;
}
