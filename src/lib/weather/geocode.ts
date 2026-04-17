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

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "fr");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 * 24 * 30 }, // 30 jours
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  const data: OpenMeteoGeocodeResponse = await res.json();
  const first = data.results?.[0];

  if (!first) return null;

  return {
    name: first.name,
    country: first.country,
    latitude: first.latitude,
    longitude: first.longitude,
  };
}