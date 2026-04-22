export type WeatherTimelinePoint = {
  date: string;
  temperatureMax: number | null;
  humidityAverage: number | null;
  rainTotal: number | null;
  precipitationProbabilityMax: number | null;
  isForecast: boolean;
};

type OpenMeteoTimelineResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    rain?: number[];
    precipitation_probability?: number[];
  };
};

type AggregateBucket = {
  date: string;
  temperatureMax: number | null;
  humiditySum: number;
  humidityCount: number;
  rainTotal: number;
  precipitationProbabilityMax: number | null;
};

function getDateKey(value: string) {
  return value.split("T")[0] || value;
}

export async function getWeatherTimeline(latitude: number, longitude: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "rain",
      "precipitation_probability",
    ].join(",")
  );
  url.searchParams.set("past_days", "7");
  url.searchParams.set("forecast_days", "5");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 30 },
  });

  if (!res.ok) {
    throw new Error(`Weather timeline failed: ${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoTimelineResponse;
  const hourly = data.hourly;

  if (!hourly?.time?.length) return [];

  const buckets = new Map<string, AggregateBucket>();

  hourly.time.forEach((time, index) => {
    const date = getDateKey(time);
    const current = buckets.get(date) || {
      date,
      temperatureMax: null,
      humiditySum: 0,
      humidityCount: 0,
      rainTotal: 0,
      precipitationProbabilityMax: null,
    };

    const temperature = hourly.temperature_2m?.[index];
    const humidity = hourly.relative_humidity_2m?.[index];
    const rain = hourly.rain?.[index];
    const precipitationProbability = hourly.precipitation_probability?.[index];

    if (typeof temperature === "number") {
      current.temperatureMax =
        current.temperatureMax == null
          ? temperature
          : Math.max(current.temperatureMax, temperature);
    }

    if (typeof humidity === "number") {
      current.humiditySum += humidity;
      current.humidityCount += 1;
    }

    if (typeof rain === "number") {
      current.rainTotal += rain;
    }

    if (typeof precipitationProbability === "number") {
      current.precipitationProbabilityMax =
        current.precipitationProbabilityMax == null
          ? precipitationProbability
          : Math.max(current.precipitationProbabilityMax, precipitationProbability);
    }

    buckets.set(date, current);
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  return Array.from(buckets.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map<WeatherTimelinePoint>((bucket) => ({
      date: bucket.date,
      temperatureMax: bucket.temperatureMax == null ? null : Math.round(bucket.temperatureMax),
      humidityAverage:
        bucket.humidityCount > 0 ? Math.round(bucket.humiditySum / bucket.humidityCount) : null,
      rainTotal: Number(bucket.rainTotal.toFixed(1)),
      precipitationProbabilityMax: bucket.precipitationProbabilityMax,
      isForecast: bucket.date > todayKey,
    }))
    .slice(-11);
}
