import { describe, expect, it } from "vitest";

import {
  countMetricUnitFamilies,
  resolveAgentSkillTurn,
  suggestSlugFromName,
  validateAgentSkillMetricKeys,
  validateAgentSkillSlugFormat,
} from "@/backend/lib/agent/skill";

describe("agent skill lib", () => {
  it("sugere slug a partir do nome", () => {
    expect(suggestSlugFromName("Search x VTEX")).toBe("search-x-vtex");
  });

  it("rejeita slug reservado", () => {
    const result = validateAgentSkillSlugFormat("grafico");
    expect(result.ok).toBe(false);
  });

  it("limita famílias de unidade", () => {
    const result = validateAgentSkillMetricKeys([
      "vtex_revenue",
      "ga4_conversion_pct",
      "gsc_clicks",
    ]);
    expect(result.ok).toBe(false);
    expect(countMetricUnitFamilies(["vtex_revenue", "gsc_clicks"])).toBe(2);
  });

  it("resolve skill pelo slash", () => {
    const turn = resolveAgentSkillTurn("/search-vtex foque mobile", [
      {
        id: "1",
        name: "Search VTEX",
        slug: "search-vtex",
        instruction: "Cruze dados",
        metricKeys: ["gsc_clicks", "vtex_revenue"],
      },
    ]);
    expect(turn?.tail).toBe("foque mobile");
    expect(turn?.skill.slug).toBe("search-vtex");
  });

  it("ignora comando nativo", () => {
    const turn = resolveAgentSkillTurn("/grafico receita", [
      {
        id: "1",
        name: "X",
        slug: "grafico",
        instruction: "x",
        metricKeys: [],
      },
    ]);
    expect(turn).toBeNull();
  });
});
