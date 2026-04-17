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
