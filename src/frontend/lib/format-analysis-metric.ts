const ptNumber = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const ptInteger = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

/** Contagens e inteiros grandes (1.313, 3.000). */
export function formatPtInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return ptInteger.format(Math.round(value));
}

export function formatPtCurrency(
  value: number,
  maximumFractionDigits = 0,
): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

/** CTR em pontos percentuais (ex.: métrica gsc_ctr_pct da análise). */
export function formatCtrPercentPoints(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${ptNumber.format(value)}%`;
}

/** CTR ratio 0–1 (overview / API Search Console). */
export function formatCtrRatio(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const pct = value <= 1 ? value * 100 : value;
  return `${ptNumber.format(pct)}%`;
}

export function formatGscPosition(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return ptNumber.format(value);
}

function isPercentMetricKey(key: string): boolean {
  return (
    key.includes("_pct") ||
    key.includes("_rate") ||
    key.endsWith("_percent") ||
    key.includes("conversion")
  );
}

function isCountMetricKey(key: string): boolean {
  return (
    key.includes("_count") ||
    key.includes("_orders") ||
    key.includes("_sessions") ||
    key.includes("_users") ||
    key.includes("_clicks") ||
    key.includes("_impressions") ||
    key.includes("_views") ||
    key.includes("_purchase") ||
    key.includes("funnel_")
  );
}

export function formatAnalysisMetricValue(
  key: string,
  value: number | string | null,
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (isPercentMetricKey(key)) {
    return `${ptNumber.format(value)}%`;
  }

  if (key.includes("revenue") || key.includes("_value")) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  }

  if (key.includes("position")) {
    return ptNumber.format(value);
  }

  if (
    isCountMetricKey(key) ||
    Number.isInteger(value) ||
    Math.abs(value) >= 1_000
  ) {
    return ptInteger.format(Math.round(value));
  }

  return ptNumber.format(value);
}
