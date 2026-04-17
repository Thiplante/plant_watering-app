import type { Plant } from "@/lib/types";

export type WeatherInsightTone = "rain" | "heat" | "watch" | "normal";
export type HealthTone = "good" | "watch" | "danger" | "unknown";

export type WeatherInsight = {
  label: string;
  detail: string;
  tone: WeatherInsightTone;
};

export type HealthInsight = {
  label: string;
  detail: string;
  tone: HealthTone;
};

export type AdaptiveWateringInsight = {
  label: string;
  minDays: number;
  maxDays: number;
};

export function getWeatherInsight(plant: Plant): WeatherInsight {
  const advice = (plant.weather_advice || "").toLowerCase();
  const score = plant.weather_score ?? 0;

  if (score <= -1 || advice.includes("pas besoin")) {
    return {
      label: "Pas besoin d'arroser",
      detail: "La pluie ou l'humidite devraient couvrir le besoin court terme.",
      tone: "rain",
    };
  }

  if (score >= 2 || advice.includes("plus tot")) {
    return {
      label: "Arroser plus tot",
      detail: "La chaleur accelere le sechage du substrat.",
      tone: "heat",
    };
  }

  if (score === 1 || advice.includes("humidite")) {
    return {
      label: "Surveille l'humidite",
      detail: "Controle la terre avant d'arroser pour ajuster le rythme.",
      tone: "watch",
    };
  }

  return {
    label: "Rythme habituel",
    detail: "Pas de variation meteo majeure detectee pour l'instant.",
    tone: "normal",
  };
}

export function getHealthInsight(plant: Plant): HealthInsight {
  const score = plant.weather_score;

  if (score == null) {
    return {
      label: "Aucune donnee",
      detail: "Actualise la meteo pour estimer la sante court terme.",
      tone: "unknown",
    };
  }

  if (score <= -1) {
    return {
      label: "Bonne sante",
      detail: "Les conditions meteo sont favorables aujourd'hui.",
      tone: "good",
    };
  }

  if (score >= 2) {
    return {
      label: "En danger",
      detail: "La plante risque de secher plus vite que d'habitude.",
      tone: "danger",
    };
  }

  return {
    label: "A surveiller",
    detail: "Un controle rapide du substrat est recommande.",
    tone: "watch",
  };
}

export function getAdaptiveWateringInsight(plant: Plant): AdaptiveWateringInsight {
  const base = Math.max(1, plant.watering_frequency_days || 1);
  const score = plant.weather_score ?? 0;

  if (score <= -1) {
    return {
      label: "Rythme assoupli par la meteo",
      minDays: base,
      maxDays: base + 2,
    };
  }

  if (score >= 2) {
    return {
      label: "Rythme resserre par la chaleur",
      minDays: Math.max(1, base - 2),
      maxDays: Math.max(1, base - 1),
    };
  }

  if (score === 1) {
    return {
      label: "Rythme a surveiller",
      minDays: Math.max(1, base - 1),
      maxDays: base,
    };
  }

  return {
    label: "Rythme habituel recommande",
    minDays: base,
    maxDays: base + 1,
  };
}

export function getDashboardNotifications(plants: Plant[]) {
  const today = plants.filter((plant) => {
    if (!plant.last_watered_at) return false;

    const next = new Date(plant.last_watered_at);
    next.setDate(next.getDate() + plant.watering_frequency_days);
    const diff = (next.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 1;
  });

  const overdue = plants.filter((plant) => {
    if (!plant.last_watered_at) return false;

    const next = new Date(plant.last_watered_at);
    next.setDate(next.getDate() + plant.watering_frequency_days);
    return next.getTime() < Date.now();
  });

  const rainSkip = plants.filter((plant) => getWeatherInsight(plant).tone === "rain");
  const heatWatch = plants.filter((plant) => getWeatherInsight(plant).tone === "heat");

  const messages: string[] = [];

  if (today.length > 0) {
    messages.push(`${today.length} plante${today.length > 1 ? "s" : ""} a arroser bientot`);
  }

  if (overdue.length > 0) {
    messages.push(`${overdue.length} plante${overdue.length > 1 ? "s" : ""} en retard`);
  }

  if (rainSkip.length > 0) {
    messages.push(`${rainSkip.length} plante${rainSkip.length > 1 ? "s" : ""} peuvent patienter grace a la pluie`);
  }

  if (heatWatch.length > 0) {
    messages.push(`${heatWatch.length} plante${heatWatch.length > 1 ? "s" : ""} a surveiller a cause de la chaleur`);
  }

  if (messages.length === 0) {
    messages.push("Aucune alerte urgente pour le moment.");
  }

  return messages.slice(0, 4);
}
