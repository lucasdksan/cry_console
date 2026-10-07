import { robotsNoindex } from "@/backend/lib/page-audit/html";
import {
  averagePerformanceScore,
  crossDevicePerformanceGap,
} from "@/backend/lib/page-audit/pagespeed-normalize";
import type {
  CroHeuristicBlock,
  CroJourneyStep,
  HtmlSignals,
  PageSpeedPair,
  SeoAuditBlock,
  StoreContextBlock,
} from "@/backend/lib/page-audit/types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function seoCompleteness01(html: HtmlSignals | null): number {
  if (!html) return 0;
  let p = 0;
  if (String(html.title ?? "").trim().length > 0) p += 0.22;
  const desc = String(html.description ?? "").trim();
  if (desc.length >= 50) p += 0.28;
  else if (desc.length > 0) p += 0.14;
  if (String(html.canonical ?? "").trim().length > 0) p += 0.22;
  const hasH1 = html.headings.some((h) => h.level === 1);
  if (hasH1) p += 0.18;
  if (String(html.lang ?? "").trim().length > 0) p += 0.05;
  if (html.viewport) p += 0.05;
  return clamp01(p);
}

function incentiveFromJsonLd(html: HtmlSignals | null): number {
  if (!html || html.jsonLdBlocks.length === 0) return 0;
  let score = 0.08;
  const haystack = html.jsonLdBlocks.join("\n").toLowerCase();
  if (/"@type"\s*:\s*"product"/.test(haystack)) score += 0.42;
  if (/"offer"/.test(haystack)) score += 0.28;
  if (/"faqpage"/.test(haystack)) score += 0.22;
  return clamp01(score);
}

function motivation01(html: HtmlSignals | null): number {
  if (!html) return 0.35;
  let m = 0.25;
  if (html.title && html.title.length >= 10) m += 0.2;
  if (html.headings.some((h) => h.level === 1)) m += 0.2;
  if (html.hasPurchaseCta) m += 0.25;
  if (html.description && html.description.length >= 40) m += 0.1;
  return clamp01(m);
}

function perf01(pagespeed: PageSpeedPair): number {
  const avg = averagePerformanceScore(pagespeed);
  if (avg == null) return 0.5;
  return clamp01(avg / 100);
}

function buildJourney(input: {
  perf01: number;
  structured01: number;
  anxiety01: number;
  friction01: number;
  hasH1: boolean;
}): CroJourneyStep[] {
  const arrivalValue = input.perf01 * 0.7 + (1 - input.anxiety01) * 0.3;
  const arrivalCost = input.friction01 * 0.85 + (1 - input.perf01) * 0.15;

  const readingValue = (input.hasH1 ? 0.65 : 0.35) + input.structured01 * 0.35;
  const readingCost = input.anxiety01 * 0.4 + input.friction01 * 0.2;

  const interactionValue = input.structured01 * 0.5 + (1 - input.friction01) * 0.3;
  const interactionCost = input.friction01 * 0.55;

  return [
    {
      stage: "chegada",
      label: "Chegada",
      value: round3(clamp01(arrivalValue)),
      cost: round3(clamp01(arrivalCost)),
    },
    {
      stage: "leitura",
      label: "Leitura",
      value: round3(clamp01(readingValue)),
      cost: round3(clamp01(readingCost)),
    },
    {
      stage: "interacao",
      label: "Interação",
      value: round3(clamp01(interactionValue)),
      cost: round3(clamp01(interactionCost)),
    },
  ];
}

function buildDiagnosticFlags(input: {
  f: number;
  v: number;
  a: number;
  m: number;
  seoAudit: SeoAuditBlock;
  storeContext: StoreContextBlock | null;
  pagespeed: PageSpeedPair;
}): string[] {
  const flags: string[] = [];
  if (input.f >= 0.65) flags.push("HIGH_FRICTION");
  if (input.v <= 0.45) flags.push("LOW_VALUE");
  if (input.a >= 0.55) flags.push("HIGH_ANXIETY");
  if (input.m <= 0.4) flags.push("LOW_MOTIVATION");
  if (input.seoAudit.summary.high > 0) flags.push("seo_critical");
  const gap = crossDevicePerformanceGap(input.pagespeed);
  if (gap != null && gap >= 20) flags.push("MOBILE_DESKTOP_GAP");
  if (
    input.storeContext?.funnelCheckoutToPurchasePct != null &&
    input.storeContext.funnelCheckoutToPurchasePct < 30
  ) {
    flags.push("checkout_drop");
  }
  return flags;
}

function buildLaymanSummary(input: {
  heuristicScores: CroHeuristicBlock["heuristicScores"];
  experienceScore: number;
  flags: string[];
}): { overview: string; insights: string[] } {
  const { m, v, f, a } = input.heuristicScores;
  const exp = input.experienceScore;
  let overview =
    exp >= 0.12
      ? "A página tende a entregar mais ganho do que fricção nas três etapas modeladas (chegada, leitura, interação). "
      : exp >= -0.12
        ? "O balanço entre ganhos e obstáculos está equilibrado nesta URL. "
        : "Há mais obstáculos do que ganhos percebidos nesta URL — priorize performance e clareza da oferta. ";

  overview +=
    "Motivação e valor vêm do conteúdo e da estrutura; fricção e ansiedade refletem velocidade e sinais de confiança no HTML.";

  const insights: string[] = [];
  if (f >= 0.6) {
    insights.push(
      "Fricção elevada: visitantes podem desistir antes de absorver a oferta — alinhe com achados de performance.",
    );
  }
  if (v >= 0.65) {
    insights.push("Valor percebido (conteúdo e completude SEO) está relativamente forte nesta página.");
  }
  if (a >= 0.5) {
    insights.push(
      "Ansiedade elevada: canonical, dados estruturados ou indexação podem estar gerando desconfiança técnica.",
    );
  }
  if (m >= 0.6 && input.flags.includes("checkout_drop")) {
    insights.push(
      "A mensagem parece clara, mas o funil da loja indica queda no checkout — investigar etapa pós-clique.",
    );
  }

  return { overview, insights: insights.slice(0, 6) };
}

export function buildCroHeuristics(input: {
  html: HtmlSignals | null;
  pagespeed: PageSpeedPair;
  seoAudit: SeoAuditBlock;
  storeContext: StoreContextBlock | null;
}): CroHeuristicBlock {
  const html = input.html;
  const perf = perf01(input.pagespeed);
  const highIssues = input.seoAudit.summary.high;
  const pen = clamp01(highIssues * 0.12);
  const f = clamp01(1 - perf + pen * 0.85);

  const seoComp = seoCompleteness01(html);
  const v = clamp01(seoComp * 0.85 + 0.05);

  let a = 0;
  if (html) {
    if (!String(html.canonical ?? "").trim()) a += 0.18;
    if (html.jsonLdBlocks.length === 0) a += 0.14;
    if (robotsNoindex(html.robots)) a += 0.22;
    if (html.originChecks?.pathBlocked) a += 0.2;
  } else {
    a += 0.35;
  }
  a = clamp01(a);

  const i = incentiveFromJsonLd(html);
  const m = motivation01(html);

  const heuristicScores = {
    m: round3(m),
    v: round3(v),
    i: round3(i),
    f: round3(f),
    a: round3(a),
  };

  const structured01 = clamp01(
    Math.min(1, (html?.jsonLdBlocks.length ?? 0) * 0.25 + ((html?.jsonLdBlocks.length ?? 0) > 0 ? 0.35 : 0)),
  );
  const hasH1 = Boolean(html?.headings.some((h) => h.level === 1));

  const journey = buildJourney({
    perf01: perf,
    structured01,
    anxiety01: a,
    friction01: f,
    hasH1,
  });

  const experienceScore = round3(
    journey.reduce((acc, step) => acc + (step.value - step.cost), 0),
  );

  const diagnosticFlags = buildDiagnosticFlags({
    f,
    v,
    a,
    m,
    seoAudit: input.seoAudit,
    storeContext: input.storeContext,
    pagespeed: input.pagespeed,
  });

  const laymanSummary = buildLaymanSummary({
    heuristicScores,
    experienceScore,
    flags: diagnosticFlags,
  });

  return {
    heuristicScores,
    journey,
    experienceScore,
    diagnosticFlags,
    laymanSummary,
  };
}
