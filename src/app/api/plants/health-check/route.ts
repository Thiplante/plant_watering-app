import { NextRequest, NextResponse } from "next/server";
import { getPlantForUser, requireRouteUser } from "@/lib/server/plant-access";

export const dynamic = "force-dynamic";

type HealthCheckResponse = {
  summary: string;
  urgency: "low" | "medium" | "high";
  likely_cause: string;
  recommendations: string[];
};

function isHealthCheckResponse(value: unknown): value is HealthCheckResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as HealthCheckResponse;
  return (
    typeof candidate.summary === "string" &&
    ["low", "medium", "high"].includes(candidate.urgency) &&
    typeof candidate.likely_cause === "string" &&
    Array.isArray(candidate.recommendations) &&
    candidate.recommendations.every((item) => typeof item === "string")
  );
}

function extractStructuredText(data: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  for (const outputItem of data.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        return contentItem.text;
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (!openAiApiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY manquante" }, { status: 503 });
    }

    const body = (await req.json()) as {
      imageDataUrl?: string;
      imageUrl?: string;
      plantId?: string;
    };
    const imageSource = body.imageDataUrl || body.imageUrl;

    if (!imageSource) {
      return NextResponse.json({ error: "Image manquante" }, { status: 400 });
    }

    const auth = await requireRouteUser(req);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!body.plantId) {
      return NextResponse.json({ error: "plantId manquant" }, { status: 400 });
    }

    const access = await getPlantForUser(body.plantId, auth.user);

    if (!access.plant) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Analyse la photo d'une plante et detecte de facon prudente les signes visibles de stress. Reponds en JSON strict avec un resume court, un niveau d'urgence low medium high, une cause probable et trois recommandations concretes.",
              },
              {
                type: "input_image",
                image_url: imageSource,
                detail: "high",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "plant_health_check",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                urgency: { type: "string", enum: ["low", "medium", "high"] },
                likely_cause: { type: "string" },
                recommendations: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: { type: "string" },
                },
              },
              required: ["summary", "urgency", "likely_cause", "recommendations"],
            },
          },
        },
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Erreur OpenAI lors du diagnostic" },
        { status: 500 }
      );
    }

    const structuredText = extractStructuredText(data);
    const parsed = structuredText ? JSON.parse(structuredText) : null;

    if (!isHealthCheckResponse(parsed)) {
      return NextResponse.json({ error: "Diagnostic invalide" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("POST /api/plants/health-check error:", error);
    return NextResponse.json({ error: "Erreur serveur pendant le diagnostic" }, { status: 500 });
  }
}
