import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { geocodeCity } from "@/lib/weather/geocode";
import { getWeatherTimeline } from "@/lib/weather/timeline";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Variables Supabase manquantes" },
        { status: 500 }
      );
    }

    const plantId = req.nextUrl.searchParams.get("plantId");

    if (!plantId) {
      return NextResponse.json({ error: "plantId manquant" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: plant, error: plantError } = await supabase
      .from("plants")
      .select("id, city, latitude, longitude")
      .eq("id", plantId)
      .single();

    if (plantError || !plant) {
      return NextResponse.json({ error: "Plante introuvable" }, { status: 404 });
    }

    let latitude: number | null = plant.latitude;
    let longitude: number | null = plant.longitude;

    if ((latitude == null || longitude == null) && plant.city) {
      const geo = await geocodeCity(plant.city);

      if (!geo) {
        return NextResponse.json(
          { error: "Ville introuvable pour le geocodage" },
          { status: 400 }
        );
      }

      latitude = geo.latitude;
      longitude = geo.longitude;

      await supabase
        .from("plants")
        .update({ latitude, longitude })
        .eq("id", plantId);
    }

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "Coordonnees meteo indisponibles" },
        { status: 400 }
      );
    }

    const timeline = await getWeatherTimeline(latitude, longitude);

    return NextResponse.json({
      city: plant.city,
      latitude,
      longitude,
      timeline,
    });
  } catch (error) {
    console.error("GET /api/weather/timeline error:", error);

    return NextResponse.json({ error: "Erreur serveur meteo detaillee" }, { status: 500 });
  }
}
