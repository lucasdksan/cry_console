import type { AnalyticsNormalized } from "@/backend/lib/shared/normalized-adapters";
import type { ClarityNormalized } from "@/backend/lib/shared/normalized-adapters";
import type { SearchConsoleNormalized } from "@/backend/lib/shared/normalized-adapters";
import type {
  AnalysisAlert,
  AnalysisDataGap,
  AnalysisMeasurementJson,
  AnalysisPillarCard,
} from "@/backend/lib/analysis/types";
import { PILLAR_TITLES, PILLARS } from "@/backend/lib/analysis/types";
import {
  overallScoreFromPillars,
  overallStatusFromScore,
  scoreFromAlerts,
  statusFromScore,
} from "@/backend/lib/analysis/scoring";
import type { Pillar } from "@/backend/lib/vtex/registry";
import type { MetricDayRow } from "@/backend/models/workspace-metric.model";
import type { OverviewPeriod } from "@/backend/lib/overview/period";

export type AnalysisHeuristicsInput = {
  period: OverviewPeriod;
  collectedAt: string;
  vtexConfigured: boolean;
  gaConfigured: boolean;
  gscConfigured: boolean;
  clarityConfigured: boolean;
  vtexOk: boolean;
  gaOk: boolean;
  gscOk: boolean;
  clarityOk: boolean;
  vtexMetrics: {
    order_count: number;
    revenue: number;
    canceled: number;
  } | null;
  analytics: AnalyticsNormalized | null;
  searchConsole: SearchConsoleNormalized | null;
  clarity: ClarityNormalized | null;
  metricDays: MetricDayRow[];
};

function alert(
  id: string,
  severity: AnalysisAlert["severity"],
  message: string,
): AnalysisAlert {
  return { id, severity, message };
}

function pct(n: number, d: number): number {
  if (d <= 0) {
    return 0;
  }
  return (n / d) * 100;
}

function trendPct(values: number[]): number | null {
  if (values.length < 4) {
    return null;
  }
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const a = avg(first);
  const b = avg(second);
  if (a <= 0) {
    return b > 0 ? 100 : 0;
  }
  return ((b - a) / a) * 100;
}

function buildAquisicao(input: AnalysisHeuristicsInput): AnalysisPillarCard {
  const gaps: AnalysisDataGap[] = [];
  const alerts: AnalysisAlert[] = [];
  const metrics: Record<string, number | string | null> = {};

  if (!input.gaConfigured && !input.gscConfigured) {
    return {
      pillar: "aquisicao",
      title: PILLAR_TITLES.aquisicao,
      available: false,
      status: "Indisponível",
      metrics: {},
      alerts: [],
      data_gaps: [
        {
          source: "analytics",
          reason: "GA4 não configurado",
          impact: "Não dá para medir tráfego e conversão por canal.",
        },
        {
          source: "search-console",
          reason: "Search Console não configurado",
          impact: "Não dá para medir busca orgânica.",
        },
      ],
    };
  }

  if (input.gaOk && input.analytics?.totals) {
    metrics.ga4_sessions = input.analytics.totals.sessions ?? null;
    metrics.ga4_users = input.analytics.totals.totalUsers ?? null;
    metrics.ga4_conversion_pct =
      input.analytics.funnel_rates?.session_to_purchase_pct ?? null;
    const sessions = input.analytics.totals.sessions ?? 0;
    if (sessions < 500) {
      alerts.push(
        alert("aquisicao_low_sessions", "atencao", "Volume de sessões baixo no período."),
      );
    }
    const conv = metrics.ga4_conversion_pct as number | null;
    if (conv !== null && conv < 0.5) {
      alerts.push(
        alert(
          "aquisicao_low_conversion",
          "alerta",
          "Taxa sessão→compra abaixo de 0,5% no GA4.",
        ),
      );
    }
  } else if (input.gaConfigured) {
    gaps.push({
      source: "analytics",
      reason: "Coleta GA4 falhou ou indisponível",
      impact: "Funil de aquisição incompleto.",
    });
  }

  if (input.gscOk && input.searchConsole?.overview) {
    const o = input.searchConsole.overview;
    metrics.gsc_clicks = o.clicks;
    metrics.gsc_impressions = o.impressions;
    metrics.gsc_ctr_pct = o.ctr * 100;
    metrics.gsc_position = o.position;
    if (o.clicks < 100) {
      alerts.push(
        alert("aquisicao_low_clicks", "atencao", "Poucos cliques orgânicos no período."),
      );
    }
    if (o.ctr < 0.02) {
      alerts.push(
        alert("aquisicao_low_ctr", "alerta", "CTR orgânico abaixo de 2%."),
      );
    }
  } else if (input.gscConfigured) {
    gaps.push({
      source: "search-console",
      reason: "Coleta GSC falhou ou indisponível",
      impact: "Visibilidade em busca incompleta.",
    });
  }

  const available =
    (input.gaOk && Boolean(input.analytics)) ||
    (input.gscOk && Boolean(input.searchConsole));

  if (!available) {
    return {
      pillar: "aquisicao",
      title: PILLAR_TITLES.aquisicao,
      available: false,
      status: "Indisponível",
      metrics,
      alerts: [],
      data_gaps: gaps.length
        ? gaps
        : [
            {
              source: "aquisicao",
              reason: "Sem dados utilizáveis",
              impact: "Pilar indisponível neste run.",
            },
          ],
    };
  }

  const score = scoreFromAlerts(alerts);
  return {
    pillar: "aquisicao",
    title: PILLAR_TITLES.aquisicao,
    available: true,
    score,
    status: statusFromScore(score),
    metrics,
    alerts,
    data_gaps: gaps,
  };
}

function buildComercial(input: AnalysisHeuristicsInput): AnalysisPillarCard {
  if (!input.vtexConfigured) {
    return {
      pillar: "comercial",
      title: PILLAR_TITLES.comercial,
      available: false,
      status: "Indisponível",
      metrics: {},
      alerts: [],
      data_gaps: [
        {
          source: "vtex",
          reason: "VTEX não configurado",
          impact: "Sem receita e pedidos no período.",
        },
      ],
    };
  }

  if (!input.vtexOk || !input.vtexMetrics) {
    return {
      pillar: "comercial",
      title: PILLAR_TITLES.comercial,
      available: false,
      status: "Indisponível",
      metrics: {},
      alerts: [],
      data_gaps: [
        {
          source: "vtex",
          reason: "Coleta de pedidos falhou",
          impact: "Indicadores comerciais indisponíveis.",
        },
      ],
    };
  }

  const { order_count, revenue, canceled } = input.vtexMetrics;
  const cancelRate = pct(canceled, order_count);
  const ticket = order_count > 0 ? revenue / order_count : 0;
  const metrics: Record<string, number | string | null> = {
    vtex_revenue: revenue,
    vtex_orders: order_count,
    vtex_ticket_medio: ticket,
    vtex_cancel_rate_pct: cancelRate,
  };
  const alerts: AnalysisAlert[] = [];

  if (cancelRate > 20) {
    alerts.push(
      alert(
        "comercial_cancel_critico",
        "critico",
        "Taxa de cancelamento acima de 20%.",
      ),
    );
  } else if (cancelRate > 10) {
    alerts.push(
      alert(
        "comercial_cancel_alerta",
        "alerta",
        "Taxa de cancelamento acima de 10%.",
      ),
    );
  }

  if (order_count === 0) {
    alerts.push(
      alert("comercial_no_orders", "critico", "Nenhum pedido no período analisado."),
    );
  }

  const score = scoreFromAlerts(alerts);
  return {
    pillar: "comercial",
    title: PILLAR_TITLES.comercial,
    available: true,
    score,
    status: statusFromScore(score),
    metrics,
    alerts,
    data_gaps: [],
  };
}

function buildCrescimento(input: AnalysisHeuristicsInput): AnalysisPillarCard {
  const revenueSeries = input.metricDays
    .map((d) => (d.vtexRevenue !== null ? Number(d.vtexRevenue) : null))
    .filter((v): v is number => v !== null);
  const sessionSeries = input.metricDays
    .map((d) => d.ga4Sessions)
    .filter((v): v is number => v !== null);

  const hasTrend = revenueSeries.length >= 4 || sessionSeries.length >= 4;
  if (!hasTrend) {
    return {
      pillar: "crescimento",
      title: PILLAR_TITLES.crescimento,
      available: false,
      status: "Indisponível",
      metrics: {},
      alerts: [],
      data_gaps: [
        {
          source: "metric_days",
          reason: "Série diária insuficiente",
          impact: "Tendência de crescimento não calculada.",
        },
      ],
    };
  }

  const revTrend = trendPct(revenueSeries);
  const sessTrend = trendPct(sessionSeries);
  const metrics: Record<string, number | string | null> = {
    revenue_trend_pct: revTrend,
    sessions_trend_pct: sessTrend,
  };
  const alerts: AnalysisAlert[] = [];

  if (revTrend !== null && revTrend < -10) {
    alerts.push(
      alert(
        "crescimento_revenue_down",
        "alerta",
        "Receita na segunda metade do período caiu mais de 10% vs primeira metade.",
      ),
    );
  }
  if (sessTrend !== null && sessTrend < -10) {
    alerts.push(
      alert(
        "crescimento_sessions_down",
        "atencao",
        "Sessões na segunda metade do período caíram mais de 10% vs primeira metade.",
      ),
    );
  }

  const score = scoreFromAlerts(alerts);
  return {
    pillar: "crescimento",
    title: PILLAR_TITLES.crescimento,
    available: true,
    score,
    status: statusFromScore(score),
    metrics,
    alerts,
    data_gaps: [],
  };
}

function buildEstrategica(input: AnalysisHeuristicsInput): AnalysisPillarCard {
  const channels = input.analytics?.channels;
  if (!input.gaOk || !channels?.length) {
    return {
      pillar: "estrategica",
      title: PILLAR_TITLES.estrategica,
      available: false,
      status: "Indisponível",
      metrics: {},
      alerts: [],
      data_gaps: [
        {
          source: "analytics",
          reason: "Canais GA4 indisponíveis",
          impact: "Concentração de tráfego não medida.",
        },
      ],
    };
  }

  const totalSessions = channels.reduce((s, c) => s + (c.sessions ?? 0), 0);
  const sorted = [...channels].sort((a, b) => b.sessions - a.sessions);
  const top = sorted[0];
  const topShare =
    totalSessions > 0 && top ? (top.sessions / totalSessions) * 100 : 0;

  const metrics: Record<string, number | string | null> = {
    top_channel: top?.channel ?? null,
    top_channel_share_pct: topShare,
    channel_count: channels.length,
  };
  const alerts: AnalysisAlert[] = [];

  if (topShare > 70) {
    alerts.push(
      alert(
        "estrategica_concentration",
        "alerta",
        "Mais de 70% das sessões vêm de um único canal.",
      ),
    );
  }

  const score = scoreFromAlerts(alerts);
  return {
    pillar: "estrategica",
    title: PILLAR_TITLES.estrategica,
    available: true,
    score,
    status: statusFromScore(score),
    metrics,
    alerts,
    data_gaps: [],
  };
}

function buildExperiencia(input: AnalysisHeuristicsInput): AnalysisPillarCard {
  const gaps: AnalysisDataGap[] = [];
  const alerts: AnalysisAlert[] = [];
  const metrics: Record<string, number | string | null> = {};

  let hasSignal = false;

  if (input.clarityConfigured && input.clarityOk && input.clarity) {
    hasSignal = true;
    const sessions = input.clarity.sessions ?? 0;
    const dead = input.clarity.deadClicks ?? 0;
    const deadRate = pct(dead, sessions);
    metrics.clarity_sessions = sessions;
    metrics.clarity_dead_click_rate_pct = deadRate;
    if (deadRate > 8) {
      alerts.push(
        alert(
          "experiencia_dead_clicks",
          "alerta",
          "Taxa de dead clicks acima de 8% (Clarity).",
        ),
      );
    } else if (deadRate > 5) {
      alerts.push(
        alert(
          "experiencia_dead_clicks_atencao",
          "atencao",
          "Taxa de dead clicks acima de 5% (Clarity).",
        ),
      );
    }
  } else if (input.clarityConfigured) {
    gaps.push({
      source: "clarity",
      reason: "Clarity indisponível",
      impact: "Sinais de fricção na UI não medidos.",
    });
  }

  if (input.gaOk && input.analytics?.funnel_rates) {
    hasSignal = true;
    const f = input.analytics.funnel_rates;
    metrics.funnel_view_to_cart_pct = f.view_to_cart_pct ?? null;
    metrics.funnel_cart_to_checkout_pct = f.cart_to_checkout_pct ?? null;
    metrics.funnel_checkout_to_purchase_pct =
      f.checkout_to_purchase_pct ?? null;
    const checkoutToPurchase = f.checkout_to_purchase_pct ?? null;
    if (checkoutToPurchase !== null && checkoutToPurchase < 30) {
      alerts.push(
        alert(
          "experiencia_checkout_drop",
          "alerta",
          "Menos de 30% dos checkouts viram compra (GA4).",
        ),
      );
    }
  } else if (input.gaConfigured) {
    gaps.push({
      source: "analytics",
      reason: "Funil GA4 indisponível",
      impact: "Quedas no funil não medidas.",
    });
  }

  if (!hasSignal) {
    return {
      pillar: "experiencia",
      title: PILLAR_TITLES.experiencia,
      available: false,
      status: "Indisponível",
      metrics,
      alerts: [],
      data_gaps: gaps.length
        ? gaps
        : [
            {
              source: "experiencia",
              reason: "GA4 e Clarity não configurados",
              impact: "Pilar indisponível.",
            },
          ],
    };
  }

  const score = scoreFromAlerts(alerts);
  return {
    pillar: "experiencia",
    title: PILLAR_TITLES.experiencia,
    available: true,
    score,
    status: statusFromScore(score),
    metrics,
    alerts,
    data_gaps: gaps,
  };
}

function buildOperacional(_input: AnalysisHeuristicsInput): AnalysisPillarCard {
  return {
    pillar: "operacional",
    title: PILLAR_TITLES.operacional,
    available: false,
    status: "Indisponível",
    metrics: {},
    alerts: [],
    data_gaps: [
      {
        source: "vtex",
        reason: "Coletores de estoque e logística não incluídos na v1",
        impact: "Pilar operacional fica para uma versão futura.",
      },
    ],
  };
}

const BUILDERS: Record<
  Pillar,
  (input: AnalysisHeuristicsInput) => AnalysisPillarCard
> = {
  aquisicao: buildAquisicao,
  comercial: buildComercial,
  crescimento: buildCrescimento,
  estrategica: buildEstrategica,
  experiencia: buildExperiencia,
  operacional: buildOperacional,
};

export function buildAnalysisMeasurement(
  input: AnalysisHeuristicsInput,
): AnalysisMeasurementJson {
  const pillars = PILLARS.map((p) => BUILDERS[p](input));
  const overallScore = overallScoreFromPillars(
    pillars.map((p) => p.score),
  );
  const overallStatus = overallStatusFromScore(overallScore);

  const dataGaps: AnalysisDataGap[] = [];
  for (const pillar of pillars) {
    dataGaps.push(...pillar.data_gaps);
  }

  return {
    periodLabel: input.period.label,
    periodStart: input.period.start,
    periodEnd: input.period.end,
    collectedAt: input.collectedAt,
    pillars,
    overallScore,
    overallStatus,
    dataGaps,
  };
}
