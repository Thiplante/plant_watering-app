import type { PlantWeatherForecast } from "./forecast";

export type WeatherAdvice = {
  advice: string;
  score: number;
  tag: "rain" | "heat" | "watch" | "normal";
};

export function buildWeatherAdvice(
  forecast: PlantWeatherForecast[]
): WeatherAdvice {
  const tomorrow = forecast[1] ?? forecast[0];

  if (!tomorrow) {
    return {
      advice: "Meteo indisponible pour le moment",
      score: 0,
      tag: "normal",
    };
  }

  const rainProb = tomorrow.precipitationProbabilityMax ?? 0;
  const rainSum = tomorrow.rainSum ?? 0;
  const tempMax = tomorrow.temperatureMax ?? 0;

  if (rainProb >= 65 || rainSum >= 3) {
    return {
      advice: "Pas besoin d'arroser demain",
      score: -2,
      tag: "rain",
    };
  }

  if (tempMax >= 30) {
    return {
      advice: "Arroser plus tot, une forte chaleur est prevue",
      score: 2,
      tag: "heat",
    };
  }

  if (tempMax >= 25) {
    return {
      advice: "Surveille l'humidite du terreau demain",
      score: 1,
      tag: "watch",
    };
  }

  return {
    advice: "Conditions normales, suis le rythme habituel",
    score: 0,
    tag: "normal",
  };
}
