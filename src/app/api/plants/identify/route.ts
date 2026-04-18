import { NextRequest, NextResponse } from "next/server";
import type { PlantIdentificationOption } from "@/lib/plants/identity";

export const dynamic = "force-dynamic";

type IdentifyResponse = {
  summary: string;
  suggestions: PlantIdentificationOption[];
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
    };

    const imageSource = body.imageDataUrl || body.imageUrl;

    if (!imageSource) {
      return NextResponse.json(
        { error: "imageDataUrl ou imageUrl manquant" },
        { status: 400 }
      );
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

    const data = (await response.json()) as {
      error?: { message?: string };
      output_text?: string;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Erreur OpenAI lors de l'identification" },
        { status: 500 }
      );
    }

    const parsed = data.output_text ? JSON.parse(data.output_text) : null;

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
