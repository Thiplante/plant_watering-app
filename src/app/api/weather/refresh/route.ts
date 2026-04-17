import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { geocodeCity } from "@/lib/weather/geocode";
import { getPlantWeatherForecast } from "@/lib/weather/forecast";
import { buildWeatherAdvice } from "@/lib/weather/advice";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Variable NEXT_PUBLIC_SUPABASE_URL manquante" },
        { status: 500 }
      );
    }

    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Variable SUPABASE_SERVICE_ROLE_KEY manquante" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    const plantId = body?.plantId as string | undefined;

    if (!plantId) {
      return NextResponse.json(
        { error: "plantId manquant" },
        { status: 400 }
      );
    }

    const { data: plant, error: plantError } = await supabase
      .from("plants")
      .select("id, city, latitude, longitude")
      .eq("id", plantId)
      .single();

    if (plantError || !plant) {
      return NextResponse.json(
        { error: "Plante introuvable" },
        { status: 404 }
      );
    }

    let latitude: number | null = plant.latitude;
    let longitude: number | null = plant.longitude;

    if ((latitude == null || longitude == null) && plant.city) {
      const geo = await geocodeCity(plant.city);

      if (!geo) {
        return NextResponse.json(
          { error: "Ville introuvable pour le géocodage" },
          { status: 400 }
        );
      }

      latitude = geo.latitude;
      longitude = geo.longitude;

      const { error: coordsUpdateError } = await supabase
        .from("plants")
        .update({
          latitude,
          longitude,
        })
        .eq("id", plantId);

      if (coordsUpdateError) {
        return NextResponse.json(
          { error: coordsUpdateError.message },
          { status: 500 }
        );
      }
    }

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "Coordonnées météo indisponibles" },
        { status: 400 }
      );
    }

    const forecast = await getPlantWeatherForecast(latitude, longitude);
    const advice = buildWeatherAdvice(forecast);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("plants")
      .update({
        weather_advice: advice.advice,
        weather_score: advice.score,
        weather_updated_at: now,
      })
      .eq("id", plantId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plantId,
      weather: {
        advice: advice.advice,
        score: advice.score,
        tag: advice.tag,
        updatedAt: now,
      },
      forecast,
    });
  } catch (error) {
    console.error("POST /api/weather/refresh error:", error);

    return NextResponse.json(
      { error: "Erreur serveur météo" },
      { status: 500 }
    );
  }
}