import { buildWorkspaceAnalysisDto } from "@/backend/lib/analysis/dto";
import type {
  AnalysisAlert,
  AnalysisMeasurementJson,
  AnalysisNarrativeJson,
} from "@/backend/lib/analysis/types";
import { PILLAR_TITLES, type Pillar } from "@/backend/lib/analysis/types";
import type { AgentWorkspaceCommand } from "@/backend/lib/agent/command";
import { resolveMetricFromHint } from "@/backend/lib/agent/chart";
import { findWorkspaceAnalysisByWorkspaceId } from "@/backend/models/workspace-analysis.model";
import { listMetricDaysForRange } from "@/backend/models/workspace-metric.model";
import {
  calendarMonthPeriod,
  calendarDayFromYmd,
  ymdFromPeriodIso,
} from "@/backend/lib/workspace/period";
import { findLatestMetricSnapshotBeforeDay } from "@/backend/models/workspace-metric.model";
import type { WorkspaceMetricKey } from "@/generated/prisma/client";
import { metricValueFromSnapshot } from "@/backend/lib/workspace/alert-metrics";

export type AgentWorkspaceContext = {
  workspaceName: string;
  analysisSummary: string | null;
  measurement: AnalysisMeasurementJson | null;
  narrative: AnalysisNarrativeJson | null;
  metricDaysLoaded: boolean;
  periodLabel: string;
  metricKeyForChart: WorkspaceMetricKey;
  snapshotMetricValues: Partial<Record<WorkspaceMetricKey, number | null>>;
  sourceStatuses: {
    vtex: "ok" | "failed" | "missing";
    ga4: "ok" | "failed" | "missing";
    gsc: "ok" | "failed" | "missing";
  };
  metricDays: Awaited<ReturnType<typeof listMetricDaysForRange>>;
  period: ReturnType<typeof calendarMonthPeriod>;
};

function resolveMetricKeyForCommand(
  command?: AgentWorkspaceCommand,
): WorkspaceMetricKey {
  if (command?.kind === "chart") {
    return resolveMetricFromHint(command.metricHint);
  }
  if (command?.kind === "search") {
    return "gsc_clicks";
  }
  if (command?.kind === "health" && command.pillar === "aquisicao") {
    return "ga4_sessions";
  }
  return "vtex_revenue";
}

export async function loadAgentWorkspaceContext(input: {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  command?: AgentWorkspaceCommand;
}): Promise<AgentWorkspaceContext | null> {
  const period = calendarMonthPeriod();
  const periodStartDay = calendarDayFromYmd(ymdFromPeriodIso(period.start));
  const periodEndDay = calendarDayFromYmd(ymdFromPeriodIso(period.collectEnd));

  const [analysisRow, metricDays, snapshot] = await Promise.all([
    findWorkspaceAnalysisByWorkspaceId(input.workspaceId),
    listMetricDaysForRange(input.workspaceId, periodStartDay, periodEndDay),
    findLatestMetricSnapshotBeforeDay(
      input.workspaceId,
      "month",
      period.capturedOn,
    ),
  ]);

  let measurement: AnalysisMeasurementJson | null = null;
  let narrative: AnalysisNarrativeJson | null = null;
  let analysisSummary: string | null = null;

  if (analysisRow) {
    const dto = buildWorkspaceAnalysisDto({
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      row: analysisRow,
    });
    measurement = dto.measurement;
    narrative = dto.narrative;
    analysisSummary = [
      `Período: ${dto.periodLabel}`,
      dto.overallScore !== null
        ? `Score geral: ${dto.overallScore} (${dto.overallStatus})`
        : `Status geral: ${dto.overallStatus}`,
    ].join("\n");
  }

  const metricKeyForChart = resolveMetricKeyForCommand(input.command);

  const sourceStatuses = {
    vtex: snapshot?.vtexStatus ?? "missing",
    ga4: snapshot?.ga4Status ?? "missing",
    gsc: snapshot?.gscStatus ?? "missing",
  };

  const snapshotMetricValues: Partial<Record<WorkspaceMetricKey, number | null>> =
    {};
  if (snapshot) {
    const snap = {
      vtexRevenue: snapshot.vtexRevenue,
      vtexOrders: snapshot.vtexOrders,
      ga4Sessions: snapshot.ga4Sessions,
      ga4ConversionPct: snapshot.ga4ConversionPct,
      gscClicks: snapshot.gscClicks,
    };
    for (const key of Object.keys(
      {
        vtex_revenue: true,
        vtex_orders: true,
        ga4_sessions: true,
        ga4_conversion_pct: true,
        gsc_clicks: true,
      } satisfies Record<WorkspaceMetricKey, true>,
    ) as WorkspaceMetricKey[]) {
      snapshotMetricValues[key] = metricValueFromSnapshot(key, snap);
    }
  }

  return {
    workspaceName: input.workspaceName,
    analysisSummary,
    measurement,
    narrative,
    metricDaysLoaded: metricDays.length > 0,
    periodLabel: period.label,
    metricKeyForChart,
    snapshotMetricValues,
    sourceStatuses,
    metricDays,
    period,
  };
}

const ALERT_SEVERITY_ORDER: Record<AnalysisAlert["severity"], number> = {
  critico: 0,
  alerta: 1,
  atencao: 2,
};

function sortAlerts(alerts: AnalysisAlert[]): AnalysisAlert[] {
  return [...alerts].sort(
    (a, b) => ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity],
  );
}

export function buildWorkspacePromptSection(
  ctx: AgentWorkspaceContext,
  command?: AgentWorkspaceCommand,
): string {
  const lines: string[] = [
    `Loja: ${ctx.workspaceName}`,
    `Período de referência: ${ctx.periodLabel}`,
  ];

  if (ctx.analysisSummary) {
    lines.push(ctx.analysisSummary);
  } else {
    lines.push("Análise de saúde ainda não disponível para esta loja.");
  }

  if (command?.kind === "verdict") {
    if (ctx.narrative?.executive_verdict) {
      const v = ctx.narrative.executive_verdict;
      lines.push(
        `Veredito (fonte única): ${v.headline}. Alavanca principal: ${v.primary_lever}. Confiança: ${v.confidence}.`,
      );
    } else {
      lines.push("Veredito executivo ainda não disponível nesta loja.");
    }
    return lines.join("\n");
  }

  if (command?.kind === "alerts" && ctx.measurement) {
    const allAlerts = sortAlerts(
      ctx.measurement.pillars.flatMap((p) => p.alerts),
    );
    lines.push("Alertas (do mais grave ao mais leve — não invente outros):");
    if (allAlerts.length === 0) {
      lines.push("- Nenhum alerta registrado no período.");
    } else {
      for (const alert of allAlerts) {
        lines.push(`- [${alert.severity}] ${alert.message}`);
      }
    }
    return lines.join("\n");
  }

  if (command?.kind === "ticket" && ctx.measurement) {
    const comercial = ctx.measurement.pillars.find((p) => p.pillar === "comercial");
    lines.push("Foco comercial (dados salvos):");
    if (comercial) {
      lines.push(JSON.stringify(comercial.metrics));
      for (const alert of comercial.alerts) {
        lines.push(`- alerta: ${alert.message}`);
      }
    } else {
      lines.push("Pilar comercial indisponível.");
    }
    return lines.join("\n");
  }

  if (command?.kind === "funnel") {
    lines.push(
      "Explique o funil com base em aquisição (sessões GA4), comercial (pedidos/receita) e experiência (alertas de UX) usando apenas os pilares abaixo.",
    );
  }

  if (ctx.measurement) {
    const pillars = filterPillarsForCommand(ctx.measurement, command);
    lines.push("Pilares (dados do servidor — não invente números):");
    for (const pillar of pillars) {
      lines.push(
        `- ${pillar.title}: score ${pillar.score ?? "—"}, status ${pillar.status}, métricas ${JSON.stringify(pillar.metrics)}`,
      );
      if (pillar.alerts.length > 0) {
        lines.push(
          `  alertas: ${pillar.alerts.map((a) => a.message).join("; ")}`,
        );
      }
    }
  }

  if (ctx.narrative?.executive_verdict) {
    const v = ctx.narrative.executive_verdict;
    lines.push(
      `Veredito salvo: ${v.headline}. Alavanca: ${v.primary_lever}. Confiança: ${v.confidence}.`,
    );
  }

  if (
    command?.kind === "chart" ||
    command?.kind === "search" ||
    (command?.kind === "health" && command.pillar === "aquisicao")
  ) {
    lines.push(
      `Se fizer sentido, inclua no final da resposta o marcador [[chart:${ctx.metricKeyForChart}]] (o servidor anexa o gráfico).`,
    );
  }

  if (command?.kind === "action_plan") {
    lines.push(
      "Formate recomendações como Problema / Ação / Resultado esperado (sem inventar valores em R$).",
    );
  }

  return lines.join("\n");
}

function filterPillarsForCommand(
  measurement: AnalysisMeasurementJson,
  command?: AgentWorkspaceCommand,
) {
  if (command?.kind === "health" && command.pillar) {
    const pillar = command.pillar as Pillar;
    const card = measurement.pillars.find((p) => p.pillar === pillar);
    if (card) {
      return [card];
    }
  }
  if (command?.kind === "funnel") {
    const keys: Pillar[] = ["aquisicao", "comercial", "experiencia"];
    return measurement.pillars.filter((p) => keys.includes(p.pillar as Pillar));
  }
  if (command?.kind === "ticket") {
    const card = measurement.pillars.find((p) => p.pillar === "comercial");
    return card ? [card] : [];
  }
  return measurement.pillars;
}

export function buildAskPromptSection(chunks: { title: string; content: string }[]): string {
  if (chunks.length === 0) {
    return "Nenhum trecho do catálogo local encontrado. Responda com conhecimento geral sobre integrações de e-commerce e diga quando não souber.";
  }
  return chunks
    .map((c) => `### ${c.title}\n${c.content}`)
    .join("\n\n");
}

export function pillarTitle(pillar: Pillar): string {
  return PILLAR_TITLES[pillar];
}
