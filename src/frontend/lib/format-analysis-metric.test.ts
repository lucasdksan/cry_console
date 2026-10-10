import { describe, expect, it } from "vitest";

import {
  formatAnalysisMetricValue,
  formatCtrPercentPoints,
  formatCtrRatio,
  formatGscPosition,
  formatPtInteger,
} from "@/frontend/lib/format-analysis-metric";

describe("formatAnalysisMetricValue", () => {
  it("arredonda percentuais com até 2 casas", () => {
    expect(formatAnalysisMetricValue("gsc_ctr_pct", 0.355435565)).toBe("0,36%");
    expect(formatAnalysisMetricValue("revenue_trend_pct", 23.196460579)).toBe(
      "23,2%",
    );
  });

  it("separa milhares em inteiros grandes", () => {
    expect(formatAnalysisMetricValue("gsc_clicks", 13060)).toBe("13.060");
    expect(formatAnalysisMetricValue("gsc_impressions", 3674365)).toBe(
      "3.674.365",
    );
  });

  it("formata posição média com 2 casas", () => {
    expect(formatAnalysisMetricValue("gsc_position", 5.447809893)).toBe("5,45");
  });

  it("mostra traço para null", () => {
    expect(formatAnalysisMetricValue("sessions_trend_pct", null)).toBe("—");
  });

  it("formata inteiros do portfólio", () => {
    expect(formatPtInteger(1313)).toBe("1.313");
    expect(formatPtInteger(3000)).toBe("3.000");
  });

  it("formata GSC overview e auditoria", () => {
    expect(formatPtInteger(13060)).toBe("13.060");
    expect(formatCtrRatio(0.003555)).toBe("0,36%");
    expect(formatGscPosition(5.447809893)).toBe("5,45");
    expect(formatCtrPercentPoints(0.361569022)).toBe("0,36%");
  });
});
