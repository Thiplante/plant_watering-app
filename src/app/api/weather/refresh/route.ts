import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/lib/weather/geocode";
import { getPlantWeatherForecast } from "@/lib/weather/forecast";
import { buildWeatherAdvice } from "@/lib/weather/advice";
import {
  createAdminClient,
  getPlantForUser,
  requireRouteUser,
} from "@/lib/server/plant-access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plantId = body?.plantId as string | undefined;

    if (!plantId) {
      return NextResponse.json({ error: "plantId manquant" }, { status: 400 });
    }

    const auth = await requireRouteUser(req);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const access = await getPlantForUser(plantId, auth.user);

    if (!access.plant) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = createAdminClient();
    const plant = access.plant;

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
        { error: "Coordonnees meteo indisponibles" },
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
      return NextResponse.json({ error: updateError.message }, { status: 500 });
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

    const message = error instanceof Error ? error.message : "Erreur serveur meteo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
