import type { AppNotification, Plant } from "@/lib/types";
import { getWeatherInsight } from "./insights";

export type NotificationDraft = Pick<
  AppNotification,
  "notification_key" | "type" | "level" | "title" | "message" | "plant_id" | "metadata"
>;

function getNextWateringDate(plant: Plant) {
  if (!plant.last_watered_at) return null;

  const next = new Date(plant.last_watered_at);
  next.setDate(next.getDate() + plant.watering_frequency_days);
  return next;
}

export function buildNotificationDrafts(plants: Plant[]): NotificationDraft[] {
  const drafts: NotificationDraft[] = [];

  plants.forEach((plant) => {
    const weatherInsight = getWeatherInsight(plant);
    const nextWateringDate = getNextWateringDate(plant);
    const plantLabel = plant.name || "Cette plante";

    if (nextWateringDate) {
      const diffDays = Math.floor(
        (nextWateringDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 0) {
        drafts.push({
          notification_key: `watering-overdue:${plant.id}`,
          type: "watering_overdue",
          level: "danger",
          title: `${plantLabel} attend de l'eau`,
          message: "Cette plante devrait etre arrosee des maintenant.",
          plant_id: plant.id,
          metadata: { plantName: plant.name },
        });
      } else if (diffDays === 1) {
        drafts.push({
          notification_key: `watering-soon:${plant.id}`,
          type: "watering_soon",
          level: "warning",
          title: `${plantLabel} a arroser demain`,
          message: "Pense a preparer l'arrosage pour demain.",
          plant_id: plant.id,
          metadata: { plantName: plant.name },
        });
      }
    }

    if (weatherInsight.tone === "rain") {
      drafts.push({
        notification_key: `weather-rain:${plant.id}`,
        type: "weather_rain_skip",
        level: "success",
        title: `${plantLabel} peut patienter`,
        message: "La pluie ou l'humidite permettent de decaler l'arrosage.",
        plant_id: plant.id,
        metadata: { plantName: plant.name },
      });
    }

    if (weatherInsight.tone === "heat") {
      drafts.push({
        notification_key: `weather-heat:${plant.id}`,
        type: "weather_heat_watch",
        level: "warning",
        title: `${plantLabel} risque de secher`,
        message: "La chaleur annoncee justifie un controle avance du substrat.",
        plant_id: plant.id,
        metadata: { plantName: plant.name },
      });
    }
  });

  return drafts;
}
