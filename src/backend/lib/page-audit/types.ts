import { z } from "zod";

import type { PageAuditRoleId } from "@/backend/lib/page-audit/roles";
import type { SeoChecklistItemDTO } from "@/backend/lib/page-audit/checklist";

export const PAGE_AUDIT_CACHE_MS = 24 * 60 * 60 * 1000;

export const SEO_MODULE_DEFS = [
  { id: "rastreamento", label: "Rastreamento" },
  { id: "indexacao", label: "Indexação" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "estrutura", label: "Estrutura" },
  { id: "performance", label: "Performance" },
  { id: "links", label: "Links" },
  { id: "dados_estruturados", label: "Dados Estruturados" },
  { id: "experiencia", label: "Experiência" },
] as const;

export type PageAuditSourceStatus = "ok" | "failed" | "missing";

export type PageAuditSources = {
  html: { status: PageAuditSourceStatus; error?: string };
  pagespeed: { status: PageAuditSourceStatus; error?: string };
  store: { status: PageAuditSourceStatus };
};

export type HtmlHeading = { level: number; text: string };

export type HtmlSignals = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  canonicalCount: number;
  robots: string | null;
  lang: string | null;
  viewport: boolean;
  headings: HtmlHeading[];
  jsonLdBlocks: string[];
  jsonLdTypes: string[];
  imagesWithoutAlt: number;
  imagesSampled: number;
  hasPurchaseCta: boolean;
  anchorLinkCount: number;
  paginationLinkCount: number;
  hasVisibleBreadcrumb: boolean;
  originChecks: {
    robotsTxtOk: boolean;
    sitemapHint: string | null;
    pathBlocked: boolean;
  } | null;
};

export type PageSpeedSignals = {
  performanceScore: number | null;
  lcp: number | null;
  fcp: number | null;
  cls: number | null;
  tbt: number | null;
  ttfb: number | null;
  inp: number | null;
};

export type SeoFindingSeverity = "high" | "medium" | "low" | "info";

export type SeoFinding = {
  id: string;
  severity: SeoFindingSeverity;
  category: string;
  title: string;
  whyItMatters: string;
  howToFix: string[];
};

export type SeoModule = {
  id: string;
  label: string;
  score: number | null;
  issueCount: number;
  passCount: number;
};

export type SeoAuditBlock = {
  healthScore: number | null;
  modules: SeoModule[];
  findings: SeoFinding[];
  summary: { high: number; medium: number; low: number; info: number };
};

export type CroJourneyStep = {
  stage: "chegada" | "leitura" | "interacao";
  label: string;
  value: number;
  cost: number;
};

export type CroHeuristicBlock = {
  heuristicScores: { m: number; v: number; i: number; f: number; a: number };
  journey: CroJourneyStep[];
  experienceScore: number;
  diagnosticFlags: string[];
  laymanSummary: { overview: string; insights: string[] };
};

export type StoreContextBlock = {
  gscClicks: number | null;
  gscCtrPct: number | null;
  gscPosition: number | null;
  funnelCheckoutToPurchasePct: number | null;
  clarityDeadClickRate: number | null;
};

export type PageSpeedPair = {
  mobile: PageSpeedSignals | null;
  desktop: PageSpeedSignals | null;
};

export type PageAuditReportJson = {
  url: string;
  role: PageAuditRoleId;
  collectedAt: string;
  sources: PageAuditSources;
  html: HtmlSignals | null;
  pagespeed: PageSpeedPair;
  storeContext: StoreContextBlock | null;
  seo: SeoAuditBlock;
  cro: CroHeuristicBlock;
  disclaimer: string;
};

export const pageAuditNarrativeJsonSchema = z.object({
  summary: z.string().min(1),
  seoPriorities: z.array(z.string().min(1)).max(3),
  croPriorities: z.array(z.string().min(1)).max(3),
  confidence: z.enum(["alta", "media", "baixa"]),
});

export type PageAuditNarrativeJson = z.infer<typeof pageAuditNarrativeJsonSchema>;

export type PageAuditRoleReport = {
  role: PageAuditRoleId;
  label: string;
  url: string | null;
  collectedAt: string | null;
  status: "measured" | "complete" | "narrative_failed" | null;
  report: PageAuditReportJson | null;
  narrative: PageAuditNarrativeJson | null;
  aiRoute: string | null;
  narrativeError?: string;
  cacheFresh: boolean;
};

export type WorkspacePageAuditSetDTO = {
  workspaceId: string;
  workspaceName: string;
  siteUrl: string;
  roles: PageAuditRoleReport[];
  summary: {
    seoHealthScore: number | null;
    croExperienceScore: number | null;
  };
  checklist: SeoChecklistItemDTO[];
};

export type PageAuditPathsInput = {
  home?: string;
  category?: string;
  product?: string;
  search?: string;
};

/** @deprecated Use WorkspacePageAuditSetDTO */
export type WorkspacePageAuditDTO = {
  workspaceId: string;
  workspaceName: string;
  siteUrl: string;
  url: string;
  collectedAt: string;
  status: "measured" | "complete" | "narrative_failed";
  report: PageAuditReportJson;
  narrative: PageAuditNarrativeJson | null;
  aiRoute: string | null;
  narrativeError?: string;
  cacheFresh: boolean;
};

export const PAGE_AUDIT_DISCLAIMER =
  "A auditoria usa o HTML devolvido pelo servidor e Core Web Vitals via PageSpeed (mobile e desktop). Conteúdo injetado só no navegador pode não aparecer nos achados de HTML.";
