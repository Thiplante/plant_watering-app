import { supabase } from "@/lib/supabase";
import type { PlantLocation } from "@/lib/types";

export async function getUserLocations() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("plant_locations")
    .select("*")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  return (data || []) as PlantLocation[];
}
