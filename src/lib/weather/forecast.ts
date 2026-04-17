export type PlantWeatherForecast = {
  date: string;
  temperatureMax: number | null;
  precipitationSum: number | null;
  rainSum: number | null;
  showersSum: number | null;
  precipitationProbabilityMax: number | null;
};

type OpenMeteoForecastResponse = {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    precipitation_sum?: number[];
    rain_sum?: number[];
    showers_sum?: number[];
    precipitation_probability_max?: number[];
  };
};

export async function getPlantWeatherForecast(
  latitude: number,
  longitude: number
): Promise<PlantWeatherForecast[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "precipitation_sum",
      "rain_sum",
      "showers_sum",
      "precipitation_probability_max",
    ].join(",")
  );
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 30 }, // 30 min
  });

  if (!res.ok) {
    throw new Error(`Forecast failed: ${res.status}`);
  }

  const data: OpenMeteoForecastResponse = await res.json();
  const daily = data.daily;

  if (!daily?.time?.length) return [];

  return daily.time.map((date, i) => ({
    date,
    temperatureMax: daily.temperature_2m_max?.[i] ?? null,
    precipitationSum: daily.precipitation_sum?.[i] ?? null,
    rainSum: daily.rain_sum?.[i] ?? null,
    showersSum: daily.showers_sum?.[i] ?? null,
    precipitationProbabilityMax: daily.precipitation_probability_max?.[i] ?? null,
  }));
}