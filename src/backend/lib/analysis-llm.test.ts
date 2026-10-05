import { describe, expect, it } from "vitest";

import { analysisNarrativeJsonSchema } from "@/backend/lib/analysis-types";

describe("analysis narrative schema", () => {
  it("aceita plano vazio em pilar indisponível", () => {
    const narrative = {
      pillars: [
        "aquisicao",
        "comercial",
        "crescimento",
        "estrategica",
        "experiencia",
        "operacional",
      ].map((pillar) => ({
        pillar,
        interpretation: {
          summary: "Resumo",
          confidence: "media" as const,
        },
        action_plan: [],
      })),
      executive_verdict: {
        headline: "H",
        primary_lever: "L",
        expected_outcome_30d: "O",
        confidence: "media" as const,
      },
    };

    const parsed = analysisNarrativeJsonSchema.parse(narrative);
    expect(parsed.pillars).toHaveLength(6);
  });
});
