import { NextRequest, NextResponse } from "next/server";
import type { PlantIdentificationOption } from "@/lib/plants/identity";
import { getPlantForUser, requireRouteUser } from "@/lib/server/plant-access";

export const dynamic = "force-dynamic";

type IdentifyResponse = {
  summary: string;
  suggestions: PlantIdentificationOption[];
};

type OpenAIResponsePayload = {
  error?: { message?: string };
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function isIdentifyResponse(value: unknown): value is IdentifyResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as IdentifyResponse;
  return (
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.suggestions) &&
    candidate.suggestions.every(
      (item) =>
        item &&
        typeof item.common_name === "string" &&
        typeof item.scientific_name === "string" &&
        typeof item.confidence === "number" &&
        typeof item.reason === "string"
    )
  );
}

function extractStructuredText(data: OpenAIResponsePayload): string | null {
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
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY manquante. Ajoute-la pour activer l'identification intelligente par photo.",
        },
        { status: 503 }
      );
    }

    const body = (await req.json()) as {
      imageDataUrl?: string;
      imageUrl?: string;
      plantId?: string;
    };

    const imageSource = body.imageDataUrl || body.imageUrl;

    if (!imageSource) {
      return NextResponse.json(
        { error: "imageDataUrl ou imageUrl manquant" },
        { status: 400 }
      );
    }

    const auth = await requireRouteUser(req);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (body.plantId) {
      const access = await getPlantForUser(body.plantId, auth.user);

      if (!access.plant) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
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
                  "Analyse cette photo de plante ou fleur. Propose trois identifications plausibles, avec un nom commun en francais si possible, un nom scientifique, un score de confiance de 1 a 100 et une raison visuelle courte. Reponds en JSON strict.",
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
            name: "plant_identification",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: {
                  type: "string",
                },
                suggestions: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      common_name: { type: "string" },
                      scientific_name: { type: "string" },
                      confidence: { type: "number" },
                      reason: { type: "string" },
                    },
                    required: [
                      "common_name",
                      "scientific_name",
                      "confidence",
                      "reason",
                    ],
                  },
                },
              },
              required: ["summary", "suggestions"],
            },
          },
        },
      }),
    });

    const data = (await response.json()) as OpenAIResponsePayload;

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Erreur OpenAI lors de l'identification" },
        { status: 500 }
      );
    }

    const structuredText = extractStructuredText(data);
    const parsed = structuredText ? JSON.parse(structuredText) : null;

    if (!isIdentifyResponse(parsed)) {
      return NextResponse.json(
        { error: "Reponse d'identification invalide" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("POST /api/plants/identify error:", error);

    return NextResponse.json(
      { error: "Erreur serveur pendant l'identification de la plante" },
      { status: 500 }
    );
  }
}
