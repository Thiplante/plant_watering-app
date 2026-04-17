export type GeocodeResult = {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
};

type OpenMeteoGeocodeResponse = {
  results?: Array<{
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
  }>;
};

export async function geocodeCity(city: string): Promise<GeocodeResult | null> {
  if (!city?.trim()) return null;

  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");

    url.searchParams.set("name", city.trim());
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "fr");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString());

    if (!res.ok) {
      console.error("Geocode HTTP error:", res.status);
      return null;
    }

    const data: OpenMeteoGeocodeResponse = await res.json();

    console.log("GEOCODE RESULT:", data); // 👈 debug utile

    const first = data?.results?.[0];

    if (!first) {
      console.error("Aucun résultat géocoding pour :", city);
      return null;
    }

    return {
      name: first.name,
      country: first.country,
      latitude: first.latitude,
      longitude: first.longitude,
    };
  } catch (error) {
    console.error("Erreur geocodeCity:", error);
    return null;
  }
}