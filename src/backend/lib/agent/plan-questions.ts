import type { AgentPlanQuestionsPart } from "@/backend/lib/agent/types";

const QUESTION_HEADING_RE = /^##\s+Pergunta:\s*(.+)$/i;
const NUMBERED_QUESTION_RE = /^\d+[.)]\s+(.+)$/;
const BULLET_RE = /^[-*•]\s+(.+)$/;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}

function slugId(index: number): string {
  return `q-${index + 1}`;
}

export function parsePlanQuestionsFromText(
  text: string,
): AgentPlanQuestionsPart | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const blocks: { prompt: string; suggestions: string[] }[] = [];
  const introLines: string[] = [];
  let current: { prompt: string; suggestions: string[] } | null = null;
  let startedQuestions = false;

  function flushQuestion() {
    if (current) {
      blocks.push(current);
      current = null;
    }
  }

  for (const rawLine of trimmed.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const heading = line.match(QUESTION_HEADING_RE);
    if (heading?.[1]) {
      startedQuestions = true;
      flushQuestion();
      current = {
        prompt: stripInlineMarkdown(heading[1]),
        suggestions: [],
      };
      continue;
    }

    const numbered = line.match(NUMBERED_QUESTION_RE);
    if (numbered?.[1]) {
      startedQuestions = true;
      flushQuestion();
      current = {
        prompt: stripInlineMarkdown(numbered[1]),
        suggestions: [],
      };
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet?.[1] && current) {
      current.suggestions.push(stripInlineMarkdown(bullet[1]));
      continue;
    }

    if (current) {
      current.suggestions.push(stripInlineMarkdown(line));
      continue;
    }

    if (!startedQuestions) {
      introLines.push(stripInlineMarkdown(line));
    }
  }

  flushQuestion();

  if (blocks.length === 0) {
    return null;
  }

  return {
    type: "plan_questions",
    intro: introLines.join("\n").trim() || undefined,
    questions: blocks.map((block, index) => ({
      id: slugId(index),
      prompt: block.prompt,
      suggestions: block.suggestions,
    })),
    answered: false,
  };
}

export function formatPlanQuestionAnswers(input: {
  questions: AgentPlanQuestionsPart["questions"];
  answers: Record<string, string>;
}): string {
  const lines = ["Respostas para montar o plano:"];
  for (const question of input.questions) {
    const answer = input.answers[question.id]?.trim();
    if (answer) {
      lines.push(`- ${question.prompt}: ${answer}`);
    }
  }
  return lines.join("\n");
}
