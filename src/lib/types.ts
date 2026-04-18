export type Plant = {
  id: string;
  owner_id: string;
  name: string;
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
  updated_by: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
