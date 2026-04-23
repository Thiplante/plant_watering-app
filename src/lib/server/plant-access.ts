import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

type RouteUser = {
  id: string;
  email: string | null;
};

type PlantAccessRecord = {
  id: string;
  owner_id: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Variables Supabase manquantes");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  };
}

function extractBearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function requireRouteUser(req: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const accessToken = extractBearerToken(req);

  if (!accessToken) {
    return { user: null, error: "Authentification requise.", status: 401 };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { user: null, error: "Session invalide ou expiree.", status: 401 };
  }

  return {
    user: {
      id: user.id,
      email: user.email?.toLowerCase() || null,
    } satisfies RouteUser,
    error: null,
    status: 200,
  };
}

export function createAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

export async function getPlantForUser(
  plantId: string,
  user: RouteUser
): Promise<{ plant: PlantAccessRecord | null; error: string | null; status: number }> {
  const supabase = createAdminClient();
  const { data: plant, error: plantError } = await supabase
    .from("plants")
    .select("id, owner_id, city, latitude, longitude")
    .eq("id", plantId)
    .maybeSingle();

  if (plantError) {
    return { plant: null, error: plantError.message, status: 500 };
  }

  if (!plant) {
    return { plant: null, error: "Plante introuvable.", status: 404 };
  }

  if (plant.owner_id === user.id) {
    return { plant: plant as PlantAccessRecord, error: null, status: 200 };
  }

  const normalizedEmail = user.email?.toLowerCase();

  if (!normalizedEmail) {
    return { plant: null, error: "Acces refuse.", status: 403 };
  }

  const { data: share, error: shareError } = await supabase
    .from("plant_shares")
    .select("plant_id")
    .eq("plant_id", plantId)
    .eq("user_email", normalizedEmail)
    .maybeSingle();

  if (shareError) {
    return { plant: null, error: shareError.message, status: 500 };
  }

  if (!share) {
    return { plant: null, error: "Acces refuse.", status: 403 };
  }

  return { plant: plant as PlantAccessRecord, error: null, status: 200 };
}
