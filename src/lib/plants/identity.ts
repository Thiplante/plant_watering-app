import type { Plant } from "@/lib/types";

export type PlantIdentificationOption = {
  common_name: string;
  scientific_name: string;
  confidence: number;
  reason: string;
};

export function getPlantDisplayName(plant: Pick<Plant, "name">) {
  return plant.name || "Plante";
}

export function getPlantIdentitySubtitle(
  plant: Pick<Plant, "custom_name" | "identified_name" | "scientific_name" | "name">
) {
  if (plant.custom_name && plant.identified_name) {
    return plant.scientific_name
      ? `${plant.identified_name} • ${plant.scientific_name}`
      : plant.identified_name;
  }

  if (plant.scientific_name) {
    return plant.scientific_name;
  }

  if (plant.identified_name && plant.identified_name !== plant.name) {
    return plant.identified_name;
  }

  return null;
}
