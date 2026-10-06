export type DailyForecastObserved = {
  /** Índice monotônico no período (ex.: dia 0 … n-1). */
  index: number;
  value: number;
};

export type DailyForecastResult = {
  /** Valores previstos na mesma ordem de `futureIndices`. */
  values: number[];
  method: "mean" | "linear_trend";
  /** Coeficiente de determinação quando method === linear_trend. */
  r2: number | null;
};

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function olsLinearRegression(
  points: DailyForecastObserved[],
): { intercept: number; slope: number; r2: number } | null {
  if (points.length < 2) {
    return null;
  }
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.index, 0);
  const sumY = points.reduce((s, p) => s + p.value, 0);
  const sumXX = points.reduce((s, p) => s + p.index * p.index, 0);
  const sumXY = points.reduce((s, p) => s + p.index * p.value, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return null;
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const yHat = intercept + slope * p.index;
    ssTot += (p.value - yMean) ** 2;
    ssRes += (p.value - yHat) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { intercept, slope, r2 };
}

function clampForecast(value: number, isRateMetric: boolean): number {
  if (isRateMetric) {
    return Math.min(100, Math.max(0, value));
  }
  return Math.max(0, value);
}

/**
 * Previsão diária simples: média histórica ou regressão linear com blend
 * para a média quando o ajuste é fraco (R² baixo).
 */
export function forecastDailyValues(input: {
  observed: DailyForecastObserved[];
  futureIndices: number[];
  isRateMetric: boolean;
}): DailyForecastResult {
  const { observed, futureIndices, isRateMetric } = input;
  const valuesObs = observed.map((o) => o.value);
  const historicalMean = mean(valuesObs);

  if (observed.length < 3 || futureIndices.length === 0) {
    return {
      values: futureIndices.map(() =>
        clampForecast(historicalMean, isRateMetric),
      ),
      method: "mean",
      r2: null,
    };
  }

  const reg = olsLinearRegression(observed);
  if (!reg) {
    return {
      values: futureIndices.map(() =>
        clampForecast(historicalMean, isRateMetric),
      ),
      method: "mean",
      r2: null,
    };
  }

  const trendWeight = Math.max(0.15, Math.min(1, reg.r2));

  const values = futureIndices.map((index) => {
    const trendValue = reg.intercept + reg.slope * index;
    const blended =
      trendWeight * trendValue + (1 - trendWeight) * historicalMean;
    return clampForecast(blended, isRateMetric);
  });

  return {
    values,
    method: "linear_trend",
    r2: reg.r2,
  };
}
