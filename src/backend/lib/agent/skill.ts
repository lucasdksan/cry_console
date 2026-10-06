import type { WorkspaceMetricKey } from "@/generated/prisma/client";

import {
  isReservedAgentSlashToken,
  normalizeCommandToken,
} from "@/backend/lib/agent/command";
import { CHART_METRIC_LABELS } from "@/backend/lib/agent/types";

export const USER_AGENT_SKILL_MAX_COUNT = 30;
export const USER_AGENT_SKILL_NAME_MAX = 60;
export const USER_AGENT_SKILL_INSTRUCTION_MAX = 2000;
export const USER_AGENT_SKILL_SLUG_MIN = 2;
export const USER_AGENT_SKILL_SLUG_MAX = 32;

export const USER_AGENT_SKILL_METRIC_KEYS: WorkspaceMetricKey[] = [
  "vtex_revenue",
  "vtex_orders",
  "ga4_sessions",
  "ga4_conversion_pct",
  "gsc_clicks",
  "clarity_sessions",
  "clarity_dead_clicks",
  "clarity_quick_backs",
];

import type { AgentSkillUnitFamily } from "@/backend/lib/agent/types";

export type { AgentSkillUnitFamily };

export type UserAgentSkillRecord = {
  id: string;
  name: string;
  slug: string;
  instruction: string;
  metricKeys: WorkspaceMetricKey[];
};

export type UserAgentSkillSlashEntry = {
  name: string;
  slug: string;
};

export type ResolvedAgentSkillTurn = {
  skill: UserAgentSkillRecord;
  tail: string;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function metricUnitFamily(key: WorkspaceMetricKey): AgentSkillUnitFamily {
  switch (key) {
    case "vtex_revenue":
      return "currency";
    case "ga4_conversion_pct":
      return "percent";
    default:
      return "count";
  }
}

export function countMetricUnitFamilies(
  keys: WorkspaceMetricKey[],
): number {
  return new Set(keys.map(metricUnitFamily)).size;
}

export function validateAgentSkillMetricKeys(
  keys: WorkspaceMetricKey[],
): { ok: true } | { ok: false; error: string } {
  const unique = [...new Set(keys)];
  if (unique.length !== keys.length) {
    return { ok: false, error: "Remova métricas duplicadas." };
  }
  if (unique.length > 5) {
    return { ok: false, error: "Selecione no máximo cinco métricas." };
  }
  if (countMetricUnitFamilies(unique) > 2) {
    return {
      ok: false,
      error:
        "Use no máximo duas unidades (moeda, contagem ou percentual). Contagens podem combinar no mesmo eixo.",
    };
  }
  return { ok: true };
}

export function suggestSlugFromName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized.slice(0, USER_AGENT_SKILL_SLUG_MAX);
}

export function normalizeAgentSkillSlug(raw: string): string {
  return suggestSlugFromName(raw.replace(/\//g, ""));
}

export function validateAgentSkillSlugFormat(
  slug: string,
): { ok: true } | { ok: false; error: string } {
  if (slug.length < USER_AGENT_SKILL_SLUG_MIN) {
    return {
      ok: false,
      error: `O slug precisa ter pelo menos ${USER_AGENT_SKILL_SLUG_MIN} caracteres.`,
    };
  }
  if (slug.length > USER_AGENT_SKILL_SLUG_MAX) {
    return {
      ok: false,
      error: `O slug pode ter no máximo ${USER_AGENT_SKILL_SLUG_MAX} caracteres.`,
    };
  }
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: "Use apenas letras minúsculas, números e hífens.",
    };
  }
  if (isReservedAgentSlashToken(slug)) {
    return {
      ok: false,
      error: "Este slug conflita com um comando nativo do agente.",
    };
  }
  return { ok: true };
}

export function parseSkillInvocation(
  raw: string,
): { slugToken: string; tail: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  const withoutSlash = trimmed.slice(1);
  const [commandRaw, ...rest] = withoutSlash.split(/\s+/);
  const slugToken = normalizeCommandToken(commandRaw ?? "");
  if (!slugToken) {
    return null;
  }
  return { slugToken, tail: rest.join(" ").trim() };
}

export function resolveAgentSkillTurn(
  raw: string,
  skills: UserAgentSkillRecord[],
): ResolvedAgentSkillTurn | null {
  const parsed = parseSkillInvocation(raw);
  if (!parsed) {
    return null;
  }
  if (isReservedAgentSlashToken(parsed.slugToken)) {
    return null;
  }
  const skill = skills.find(
    (row) => normalizeAgentSkillSlug(row.slug) === parsed.slugToken,
  );
  if (!skill) {
    return null;
  }
  return { skill, tail: parsed.tail };
}

export function skillUserMessageForPrompt(tail: string, skillName: string): string {
  if (tail.trim()) {
    return tail.trim();
  }
  return `Execute a skill "${skillName}".`;
}

export function buildAgentSkillDigestSection(input: {
  skillName: string;
  periodLabel: string | null;
  presentLabels: string[];
  missingLabels: string[];
  hasWorkspace: boolean;
}): string {
  const lines: string[] = [
    `Skill: ${input.skillName}`,
    input.periodLabel
      ? `Período da loja: ${input.periodLabel}`
      : "Período da loja: não disponível",
  ];
  if (!input.hasWorkspace) {
    lines.push("Nenhuma loja vinculada à sessão — responda só com texto.");
    return lines.join("\n");
  }
  if (input.presentLabels.length > 0) {
    lines.push(`Séries no gráfico: ${input.presentLabels.join(", ")}`);
  } else {
    lines.push("Séries no gráfico: nenhuma (métricas sem pontos no período).");
  }
  if (input.missingLabels.length > 0) {
    lines.push(
      `Séries pedidas mas indisponíveis: ${input.missingLabels.join(", ")} — mencione na resposta.`,
    );
  }
  return lines.join("\n");
}

export function metricLabelsForKeys(keys: WorkspaceMetricKey[]): string[] {
  return keys.map((key) => CHART_METRIC_LABELS[key]);
}
