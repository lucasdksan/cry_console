import { describe, expect, it } from "vitest";

import { forecastDailyValues } from "@/backend/lib/workspace/daily-forecast";

describe("forecastDailyValues", () => {
  it("usa média quando há poucos pontos", () => {
    const result = forecastDailyValues({
      observed: [
        { index: 0, value: 10 },
        { index: 1, value: 20 },
      ],
      futureIndices: [2, 3],
      isRateMetric: false,
    });
    expect(result.method).toBe("mean");
    expect(result.values).toEqual([15, 15]);
  });

  it("extrapola tendência crescente com regressão", () => {
    const observed = [0, 1, 2, 3, 4].map((index) => ({
      index,
      value: 10 + index * 5,
    }));
    const result = forecastDailyValues({
      observed,
      futureIndices: [5, 6],
      isRateMetric: false,
    });
    expect(result.method).toBe("linear_trend");
    expect(result.values[0]).toBeGreaterThan(30);
    expect(result.values[1]).toBeGreaterThan(result.values[0]);
  });

  it("não projeta valores negativos em métricas acumuladas", () => {
    const observed = [0, 1, 2].map((index) => ({
      index,
      value: 100 - index * 50,
    }));
    const result = forecastDailyValues({
      observed,
      futureIndices: [3, 4],
      isRateMetric: false,
    });
    expect(result.values.every((v) => v >= 0)).toBe(true);
  });
});
