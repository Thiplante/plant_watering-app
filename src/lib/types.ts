export type Plant = {
  id: string;
  owner_id: string;
  location_id: string | null;
  name: string;
  custom_name: string | null;
  identified_name: string | null;
  scientific_name: string | null;
  identification_confidence: number | null;
  identification_options: import("@/lib/plants/identity").PlantIdentificationOption[];
  city: string | null;
  exposure: string | null;
  watering_frequency_days: number;
  can_be_watered_by_rain: boolean | null;
  last_watered_at: string | null;
  image_url: string | null;
  weather_advice: string | null;
  weather_score: number | null;
  weather_updated_at: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at?: string | null;
};

export type WateringLog = {
  id: string;
  plant_id: string;
  watered_at: string;
  user_id: string | null;
  created_at?: string | null;
};

export type PlantShare = {
  plant_id: string;
  user_email: string;
};

export type PlantNote = {
  plant_id: string;
  repotted_at: string | null;
  leaf_status: string | null;
  fertilizer_added_at: string | null;
  location_label: string | null;
  pot_size: string | null;
  substrate_type: string | null;
  purchase_date: string | null;
  pets_present: boolean;
  children_present: boolean;
  updated_by: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  household_name: string | null;
  experience_level: string | null;
  notification_opt_in: boolean;
  onboarding_completed: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PlantLocation = {
  id: string;
  owner_id: string;
  name: string;
  kind: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PlantJournalEntry = {
  id: string;
  plant_id: string;
  author_id: string | null;
  entry_type: string;
  title: string | null;
  note: string | null;
  image_url: string | null;
  observed_at: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PlantHealthCheck = {
  id: string;
  plant_id: string;
  created_by: string | null;
  image_url: string | null;
  summary: string;
  urgency: "low" | "medium" | "high";
  likely_cause: string | null;
  recommendations: string[];
  raw_observations: Record<string, unknown>;
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  plant_id: string | null;
  notification_key: string;
  type: string;
  level: "info" | "success" | "warning" | "danger";
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
