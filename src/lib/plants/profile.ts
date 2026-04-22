import type { Plant } from "@/lib/types";
import type { PlantIdentificationOption } from "@/lib/plants/identity";

export type CareExposure = "soleil" | "mi-ombre" | "ombre";
export type CareDifficulty = "facile" | "intermediaire" | "expert";
export type PetSafety = "safe" | "prudence" | "toxique" | "inconnue";

export type PlantCareProfile = {
  commonNames: string[];
  scientificNames: string[];
  headline: string;
  placement: string;
  exposure: CareExposure;
  wateringMinDays: number;
  wateringMaxDays: number;
  humidity: string;
  petSafety: PetSafety;
  difficulty: CareDifficulty;
  feeding: string;
  notes: string;
};

const CARE_PROFILES: PlantCareProfile[] = [
  {
    commonNames: ["monstera", "monstera deliciosa"],
    scientificNames: ["monstera deliciosa"],
    headline: "Grande plante tropicale qui aime la lumiere vive sans soleil brutal.",
    placement: "Interieur lumineux, a l'abri du soleil direct de midi.",
    exposure: "mi-ombre",
    wateringMinDays: 6,
    wateringMaxDays: 9,
    humidity: "Aime une humidite moyenne a elevee.",
    petSafety: "toxique",
    difficulty: "facile",
    feeding: "Engrais doux toutes les 3 a 4 semaines au printemps et en ete.",
    notes: "Laisse secher les premiers centimetres de terre entre deux arrosages.",
  },
  {
    commonNames: ["pothos", "scindapsus", "lierre du diable"],
    scientificNames: ["epipremnum aureum"],
    headline: "Plante souple et indulgente, ideale pour debuter.",
    placement: "Interieur lumineux a mi-ombre, sans soleil direct prolongé.",
    exposure: "mi-ombre",
    wateringMinDays: 7,
    wateringMaxDays: 10,
    humidity: "Tolere l'air sec mais pousse mieux avec un peu d'humidite.",
    petSafety: "toxique",
    difficulty: "facile",
    feeding: "Un engrais leger toutes les 4 semaines en periode de croissance.",
    notes: "Supporte mieux un leger oubli d'arrosage qu'un exces d'eau.",
  },
  {
    commonNames: ["langue de belle-mere", "sansevieria", "dracaena trifasciata"],
    scientificNames: ["dracaena trifasciata", "sansevieria trifasciata"],
    headline: "Plante tres robuste, parfaite pour les oublis d'arrosage.",
    placement: "Interieur lumineux ou piece plus tamisee.",
    exposure: "mi-ombre",
    wateringMinDays: 12,
    wateringMaxDays: 18,
    humidity: "Aucune exigence forte en humidite.",
    petSafety: "toxique",
    difficulty: "facile",
    feeding: "Peu d'engrais, une fois par mois au maximum en ete.",
    notes: "Le substrat doit presque secher completement avant le prochain arrosage.",
  },
  {
    commonNames: ["spathiphyllum", "fleur de lune", "peace lily"],
    scientificNames: ["spathiphyllum wallisii", "spathiphyllum"],
    headline: "Plante florifere qui aime une humidite reguliere.",
    placement: "Interieur lumineux sans soleil direct, loin des radiateurs.",
    exposure: "ombre",
    wateringMinDays: 4,
    wateringMaxDays: 6,
    humidity: "Prefere une bonne humidite ambiante.",
    petSafety: "toxique",
    difficulty: "intermediaire",
    feeding: "Engrais floraison leger toutes les 4 semaines en croissance.",
    notes: "Les feuilles tombantes signalent vite un manque d'eau, mais elle repart bien.",
  },
  {
    commonNames: ["orchidee", "phalaenopsis"],
    scientificNames: ["phalaenopsis", "phalaenopsis amabilis"],
    headline: "Floraison elegante avec besoin d'un rythme d'arrosage precis.",
    placement: "Interieur lumineux sans soleil direct, ambiance stable.",
    exposure: "mi-ombre",
    wateringMinDays: 7,
    wateringMaxDays: 10,
    humidity: "Aime l'humidite sans eau stagnante dans le cache-pot.",
    petSafety: "safe",
    difficulty: "intermediaire",
    feeding: "Engrais orchidee tres dilue une a deux fois par mois.",
    notes: "Mieux vaut un bain court bien egoutte qu'un substrat constamment humide.",
  },
  {
    commonNames: ["geranium", "pelargonium"],
    scientificNames: ["pelargonium", "pelargonium x hortorum"],
    headline: "Plante fleurie tres genereuse qui aime la lumiere et l'air.",
    placement: "Balcon, fenetre tres lumineuse ou exterieur en saison.",
    exposure: "soleil",
    wateringMinDays: 3,
    wateringMaxDays: 5,
    humidity: "Pas de besoin particulier, eviter simplement la stagnation.",
    petSafety: "prudence",
    difficulty: "facile",
    feeding: "Engrais floraison regulier en pleine saison.",
    notes: "Arroser au pied et laisser la surface du terreau secher legerement.",
  },
  {
    commonNames: ["ficus elastica", "caoutchouc", "ficus"],
    scientificNames: ["ficus elastica"],
    headline: "Belle plante graphique qui aime la regularite.",
    placement: "Interieur lumineux, sans courant d'air froid.",
    exposure: "mi-ombre",
    wateringMinDays: 7,
    wateringMaxDays: 10,
    humidity: "Aime une humidite moderee.",
    petSafety: "toxique",
    difficulty: "intermediaire",
    feeding: "Engrais vert toutes les 3 a 4 semaines en croissance.",
    notes: "Les feuilles peuvent marquer vite si l'arrosage est trop irrégulier.",
  },
  {
    commonNames: ["aloe vera", "aloe"],
    scientificNames: ["aloe vera", "aloe barbadensis miller"],
    headline: "Succulente lumineuse qui craint surtout l'exces d'eau.",
    placement: "Interieur tres lumineux ou proche d'une fenetre ensoleillee.",
    exposure: "soleil",
    wateringMinDays: 12,
    wateringMaxDays: 18,
    humidity: "Prefere un air plutot sec.",
    petSafety: "prudence",
    difficulty: "facile",
    feeding: "Tres peu d'engrais, une fois par mois maximum au printemps.",
    notes: "Toujours laisser le substrat secher entre deux arrosages.",
  },
  {
    commonNames: ["calathea", "maranta"],
    scientificNames: ["calathea", "goeppertia", "maranta leuconeura"],
    headline: "Feuillage superbe mais demande une ambiance stable et humide.",
    placement: "Interieur sans soleil direct, loin des sources de chaleur.",
    exposure: "ombre",
    wateringMinDays: 4,
    wateringMaxDays: 6,
    humidity: "Aime une humidite elevee et une eau peu calcaire.",
    petSafety: "safe",
    difficulty: "expert",
    feeding: "Engrais leger toutes les 4 semaines en saison.",
    notes: "Les pointes seches apparaissent vite si l'air est trop sec.",
  },
  {
    commonNames: ["zz plant", "zamioculcas", "plante zz"],
    scientificNames: ["zamioculcas zamiifolia"],
    headline: "Championne des oublis avec une tres bonne tolerance a la faible lumiere.",
    placement: "Interieur, meme dans une piece moyenne en lumiere.",
    exposure: "mi-ombre",
    wateringMinDays: 12,
    wateringMaxDays: 18,
    humidity: "Tolere bien l'air interieur classique.",
    petSafety: "toxique",
    difficulty: "facile",
    feeding: "Un engrais leger toutes les 4 a 6 semaines en saison suffit.",
    notes: "Attendre que le terreau soit bien sec avant d'arroser.",
  },
];

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesProfile(profile: PlantCareProfile, labels: string[]) {
  const profileLabels = [...profile.commonNames, ...profile.scientificNames].map(normalizeLabel);

  return labels.some((label) =>
    profileLabels.some(
      (profileLabel) =>
        label === profileLabel ||
        label.includes(profileLabel) ||
        profileLabel.includes(label)
    )
  );
}

export function getCareProfileFromNames(names: string[]) {
  const normalizedLabels = names.map(normalizeLabel).filter(Boolean);
  if (normalizedLabels.length === 0) return null;

  return CARE_PROFILES.find((profile) => matchesProfile(profile, normalizedLabels)) || null;
}

export function getCareProfileFromIdentification(option: PlantIdentificationOption | null) {
  if (!option) return null;

  return getCareProfileFromNames([option.common_name, option.scientific_name]);
}

export function getCareProfileForPlant(plant: Pick<
  Plant,
  "identified_name" | "scientific_name" | "name"
>) {
  return getCareProfileFromNames([
    plant.identified_name || "",
    plant.scientific_name || "",
    plant.name || "",
  ]);
}

export function getRecommendedWateringDays(profile: PlantCareProfile) {
  return Math.round((profile.wateringMinDays + profile.wateringMaxDays) / 2);
}

export function getPetSafetyLabel(petSafety: PetSafety) {
  switch (petSafety) {
    case "safe":
      return "Compatible animaux";
    case "prudence":
      return "Prudence animaux";
    case "toxique":
      return "Toxique animaux";
    default:
      return "Compatibilite inconnue";
  }
}

export function getDifficultyLabel(difficulty: CareDifficulty) {
  switch (difficulty) {
    case "facile":
      return "Facile";
    case "intermediaire":
      return "Intermediaire";
    default:
      return "Expert";
  }
}
