import type { Plant } from "@/lib/types";

export type PlantIdentificationOption = {
  common_name: string;
  scientific_name: string;
  confidence: number;
  reason: string;
};

export function clampConfidence(confidence: number) {
  if (!Number.isFinite(confidence)) return 0;
  return Math.min(100, Math.max(0, Math.round(confidence)));
}

export function getConfidenceLabel(confidence: number) {
  const safeConfidence = clampConfidence(confidence);

  if (safeConfidence >= 85) return "Tres probable";
  if (safeConfidence >= 65) return "Probable";
  if (safeConfidence >= 40) return "A verifier";
  return "Peu probable";
}

export function getConfidenceTone(confidence: number) {
  const safeConfidence = clampConfidence(confidence);

  if (safeConfidence >= 85) return "confidence-high";
  if (safeConfidence >= 65) return "confidence-medium";
  if (safeConfidence >= 40) return "confidence-watch";
  return "confidence-low";
}

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
