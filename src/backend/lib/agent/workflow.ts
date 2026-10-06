import type { AgentActionPlanItem } from "@/backend/lib/agent/types";
import type {
  AgentWorkflowPart,
  AgentWorkflowPhase,
  AgentWorkflowStep,
} from "@/backend/lib/agent/types";

const BULLET_STEP_RE = /^\s*(?:\d+\.|[-*])\s+(.+)$/;
const HEADING_RE = /^#{1,3}\s+(.+)$/;
const PHASE_RE =
  /^(?:\*\*)?\s*(Semana\s+\d+[^*\n]*|Fase\s+\d+[^*\n]*|Etapa\s+\d+[^*\n]*)\s*(?:\*\*)?\s*:?\s*(.*)$/i;
const ACTION_RE =
  /^(?:\*\*)?\s*(Ação\s+[\d.]+)\s*(?:\*\*)?\s*:?\s*(.+)$/i;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^#+\s*/, "")
    .trim();
}

function extractPassosSection(markdown: string): string | null {
  const match = markdown.match(
    /##\s+Passos[^\n]*\n([\s\S]*?)(?=\n##\s+|\n#\s+|$)/i,
  );
  return match?.[1]?.trim() ?? null;
}

function parsePhaseLine(line: string): { title: string } | null {
  const cleaned = stripInlineMarkdown(line);
  const phase = cleaned.match(PHASE_RE);
  if (phase) {
    const suffix = phase[2]?.trim();
    const title = suffix
      ? `${phase[1].trim()}: ${suffix}`
      : phase[1].trim();
    return { title: stripInlineMarkdown(title) };
  }
  if (/^Semana\s+\d+/i.test(cleaned) || /^Fase\s+\d+/i.test(cleaned)) {
    return { title: cleaned };
  }
  const heading = line.match(HEADING_RE);
  if (heading?.[1] && !/^Ação\s+/i.test(heading[1])) {
    return { title: stripInlineMarkdown(heading[1]) };
  }
  return null;
}

function parseActionLine(line: string): AgentWorkflowStep | null {
  const cleaned = stripInlineMarkdown(line);
  const action = cleaned.match(ACTION_RE);
  if (action?.[1] && action[2]) {
    return {
      id: `action-${action[1].replace(/\s+/g, "-").toLowerCase()}`,
      label: action[1].trim(),
      detail: action[2].trim(),
    };
  }
  const bullet = line.match(BULLET_STEP_RE);
  if (bullet?.[1]) {
    const text = stripInlineMarkdown(bullet[1]);
    if (/^Ação\s+[\d.]+/i.test(text)) {
      const split = text.match(/^(Ação\s+[\d.]+)\s*:?\s*(.*)$/i);
      if (split) {
        return {
          id: `action-${split[1].replace(/\s+/g, "-").toLowerCase()}`,
          label: split[1].trim(),
          detail: split[2]?.trim() || undefined,
        };
      }
    }
    if (text.length > 2) {
      return {
        id: `step-${text.slice(0, 24).replace(/\W+/g, "-")}`,
        label: text,
      };
    }
  }
  return null;
}

function buildPhasesFromLines(lines: string[]): AgentWorkflowPhase[] {
  const phases: AgentWorkflowPhase[] = [];
  let current: AgentWorkflowPhase | null = null;

  function ensurePhase(fallbackTitle?: string) {
    if (!current) {
      current = {
        id: `phase-${phases.length + 1}`,
        title: fallbackTitle ?? `Etapa ${phases.length + 1}`,
        steps: [],
      };
      phases.push(current);
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      continue;
    }

    const phase = parsePhaseLine(line);
    if (phase) {
      current = {
        id: `phase-${phases.length + 1}`,
        title: phase.title,
        steps: [],
      };
      phases.push(current);
      continue;
    }

    const action = parseActionLine(line);
    if (action) {
      ensurePhase();
      current!.steps.push({
        ...action,
        id: `${current!.id}-${current!.steps.length + 1}`,
      });
      continue;
    }

    const plain = stripInlineMarkdown(line);
    if (plain.length > 8 && !/^Entrega/i.test(plain)) {
      ensurePhase();
      current!.steps.push({
        id: `${current!.id}-${current!.steps.length + 1}`,
        label: plain,
      });
    }
  }

  return phases.filter((p) => p.steps.length > 0 || p.title.length > 0);
}

function flattenPhasesToNodes(
  phases: AgentWorkflowPhase[],
): NonNullable<AgentWorkflowPart["nodes"]> {
  const nodes: NonNullable<AgentWorkflowPart["nodes"]> = [];
  for (const phase of phases) {
    nodes.push({
      id: phase.id,
      label: phase.title,
    });
    for (const step of phase.steps) {
      nodes.push({
        id: step.id,
        label: step.label,
        detail: step.detail,
      });
    }
  }
  return nodes;
}

export function buildWorkflowPartFromPlanMarkdown(
  markdown: string,
): AgentWorkflowPart | null {
  const passos = extractPassosSection(markdown);
  const lines = (passos ?? markdown).split("\n");
  const phases = buildPhasesFromLines(lines);
  if (phases.length === 0) {
    return null;
  }
  return {
    type: "workflow",
    title: "Fluxo do plano",
    phases,
    nodes: flattenPhasesToNodes(phases),
  };
}

export function buildWorkflowPartFromActionPlanItems(
  items: AgentActionPlanItem[],
): AgentWorkflowPart | null {
  if (items.length === 0) {
    return null;
  }
  const phases: AgentWorkflowPhase[] = [
    {
      id: "phase-1",
      title: "Plano de ação",
      steps: items.map((item, index) => ({
        id: `action-${index + 1}`,
        label: item.title,
        detail: item.action,
      })),
    },
  ];
  return {
    type: "workflow",
    title: "Fluxo do plano",
    phases,
    nodes: flattenPhasesToNodes(phases),
  };
}
