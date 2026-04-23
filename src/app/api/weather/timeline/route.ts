import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/lib/weather/geocode";
import { getWeatherTimeline } from "@/lib/weather/timeline";
import {
  createAdminClient,
  getPlantForUser,
  requireRouteUser,
} from "@/lib/server/plant-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const plantId = req.nextUrl.searchParams.get("plantId");

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

    const message =
      error instanceof Error ? error.message : "Erreur serveur meteo detaillee";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
