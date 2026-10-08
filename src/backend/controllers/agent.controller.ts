"use server";

import { redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import {
  ASK_WORKSPACE_BLOCK_MESSAGE,
  isWorkspaceCommandBlockedInAsk,
  parseAgentInput,
  type AgentWorkspaceCommand,
} from "@/backend/lib/agent/command";
import {
  buildChartPartForWorkspaceCommand,
  buildSkillChartPart,
} from "@/backend/lib/agent/chart";
import {
  buildAgentMessageParts,
  computeArtifactsFromText,
  mergePlanArtifacts,
} from "@/backend/lib/agent/parts";
import { parsePlanQuestionsFromText } from "@/backend/lib/agent/plan-questions";
import { classifyPlanAssistantTurn } from "@/backend/lib/agent/plan-turn";
import {
  buildWorkflowPartFromActionPlanItems,
  buildWorkflowPartFromPlanMarkdown,
} from "@/backend/lib/agent/workflow";
import {
  buildAgentSkillDigestSection,
  metricLabelsForKeys,
  resolveAgentSkillTurn,
  skillUserMessageForPrompt,
  type ResolvedAgentSkillTurn,
} from "@/backend/lib/agent/skill";
import {
  loadAgentWorkspaceContext,
} from "@/backend/lib/agent/context";
import {
  AGENT_OBSERVABILITY_NO_WORKSPACE,
  AGENT_OBSERVABILITY_UNAVAILABLE,
  buildObservabilityPromptSection,
} from "@/backend/lib/agent/observability";
import { loadWorkspaceObservability } from "@/backend/controllers/observability-query";
import { defaultAgentKnowledgeRetriever } from "@/backend/lib/agent/knowledge";
import {
  buildAgentPrompt,
  isValidPlanMarkdown,
} from "@/backend/lib/agent/prompt";
import { revalidateAgentNav } from "@/backend/lib/agent/revalidate-nav";
import type {
  AgentMessageParts,
  AgentMessagePublic,
  AgentModelChoice,
  AgentSessionPublic,
} from "@/backend/lib/agent/types";
import {
  AiGenerateError,
  generateTextWithPlatformGemini,
  generateTextWithUserProvider,
} from "@/backend/lib/ai/generate";
import {
  isPlatformGeminiConfigured,
  readPlatformGeminiConfig,
} from "@/backend/lib/ai/platform-config";
import {
  buildAgentModelOptions,
  parseAgentModelOptionId,
  type AgentModelOptionDto,
} from "@/backend/lib/ai/model-options";
import { isAiProviderKey } from "@/backend/lib/ai/provider-catalog";
import {
  resolveModelForProvider,
  validateUserProviderConfig,
} from "@/backend/lib/ai/route";
import { CredentialsCryptoError } from "@/backend/lib/account/credentials-crypto";
import {
  appendAgentMessage,
  countAgentMessages,
  updateAgentMessageParts,
  createAgentSession,
  deleteAgentMessage,
  deleteAgentSessionForUser,
  findAgentSessionForUser,
  listAgentMessages,
  listAgentSessionsForUser,
  parseMessageParts,
  updateAgentSessionMeta,
  type AgentSessionRow,
} from "@/backend/models/agent-session.model";
import { createAiUsageLog } from "@/backend/models/workspace-analysis.model";
import {
  loadUserAiProviderCredentials,
  listUserAiProvidersForRouting,
} from "@/backend/models/user-ai-provider.model";
import { listUserAgentSkillsForAgent } from "@/backend/models/user-agent-skill.model";
import { findWorkspaceForUser } from "@/backend/models/workspace.model";
import type { AgentChatMode, AgentModelSource } from "@/generated/prisma/client";

const OBSERVABILITY_PROMPT_TIMEOUT_MS = 8000;

/** Nunca rejeita: o contexto do Sentry é opcional e não pode derrubar o turno. */
async function resolveObservabilityPromptSection(
  userId: string,
  workspaceId: string | null,
): Promise<string> {
  if (!workspaceId) {
    return AGENT_OBSERVABILITY_NO_WORKSPACE;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const dto = await Promise.race([
      loadWorkspaceObservability(userId, workspaceId),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), OBSERVABILITY_PROMPT_TIMEOUT_MS);
      }),
    ]);
    return dto
      ? buildObservabilityPromptSection(dto)
      : AGENT_OBSERVABILITY_UNAVAILABLE;
  } catch {
    return AGENT_OBSERVABILITY_UNAVAILABLE;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Remove a mensagem do usuário de um turno que falhou, para o banco refletir
 * o rollback otimista do chat. A sessão só é apagada se ficou vazia e foi
 * criada pelo próprio turno.
 */
async function discardFailedTurn(input: {
  userId: string;
  sessionId: string;
  userMessageId: string;
  discardSession: boolean;
}): Promise<void> {
  await deleteAgentMessage({
    sessionId: input.sessionId,
    messageId: input.userMessageId,
  });
  if (
    input.discardSession &&
    (await countAgentMessages(input.sessionId)) === 0
  ) {
    await deleteAgentSessionForUser(input.userId, input.sessionId);
  }
  revalidateAgentNav();
}

export type AgentModelOption = AgentModelOptionDto;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

function toSessionPublic(row: {
  id: string;
  title: string;
  mode: AgentChatMode;
  workspaceId: string | null;
  updatedAt: Date;
  workspace: { name: string } | null;
}): AgentSessionPublic {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    workspaceId: row.workspaceId,
    workspaceName: row.workspace?.name ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessagePublic(row: {
  id: string;
  role: "user" | "assistant";
  content: string;
  partsJson: unknown;
  modelSource: AgentModelSource | null;
  providerKey: string | null;
  model: string | null;
  createdAt: Date;
}): AgentMessagePublic {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    parts: parseMessageParts(row.partsJson),
    modelSource: row.modelSource,
    providerKey: row.providerKey,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAgentSessionsForNav(): Promise<AgentSessionPublic[]> {
  const userId = await requireUserId();
  const rows = await listAgentSessionsForUser(userId, 15);
  return rows.map(toSessionPublic);
}

export async function listAgentModelOptions(input: {
  chromeReady: boolean;
}): Promise<AgentModelOption[]> {
  const userId = await requireUserId();
  const providers = await listUserAiProvidersForRouting(userId);

  return buildAgentModelOptions({
    providers,
    platformGeminiConfigured: isPlatformGeminiConfigured(),
    platformModel: readPlatformGeminiConfig().model,
    chromeReady: input.chromeReady,
  });
}

export async function getAgentSessionDetail(sessionId: string): Promise<
  | {
      ok: true;
      session: AgentSessionPublic;
      messages: AgentMessagePublic[];
    }
  | { ok: false; error: string; retryable?: boolean }
> {
  const userId = await requireUserId();
  const session = await findAgentSessionForUser(userId, sessionId);
  if (!session) {
    return { ok: false, error: "Sessão não encontrada." };
  }
  const messages = await listAgentMessages(sessionId);
  return {
    ok: true,
    session: toSessionPublic(session),
    messages: messages.map(toMessagePublic),
  };
}

export async function createAgentSessionAction(input: {
  workspaceId?: string | null;
  mode?: AgentChatMode;
}): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const userId = await requireUserId();

  if (input.workspaceId) {
    const workspace = await findWorkspaceForUser(userId, input.workspaceId);
    if (!workspace) {
      return { ok: false, error: "Workspace não encontrado." };
    }
  } else if ((input.mode ?? "agent") !== "ask") {
    return {
      ok: false,
      error: "Selecione um workspace para Agent ou Plan.",
    };
  }

  const session = await createAgentSession({
    userId,
    workspaceId: input.workspaceId ?? null,
    mode: input.mode ?? "agent",
  });

  revalidateAgentNav();
  return { ok: true, sessionId: session.id };
}

export async function deleteAgentSessionAction(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const deleted = await deleteAgentSessionForUser(userId, sessionId);
  if (!deleted) {
    return { ok: false, error: "Sessão não encontrada." };
  }
  revalidateAgentNav();
  return { ok: true };
}

export async function renameAgentSessionAction(
  sessionId: string,
  title: string,
): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { ok: false, error: "Dê um nome para a conversa." };
  }
  if (trimmed.length > 80) {
    return { ok: false, error: "O nome deve ter até 80 caracteres." };
  }
  const session = await findAgentSessionForUser(userId, sessionId);
  if (!session) {
    return { ok: false, error: "Sessão não encontrada." };
  }
  await updateAgentSessionMeta({ sessionId, title: trimmed });
  revalidateAgentNav(sessionId);
  return { ok: true, title: trimmed };
}

async function generateWithModelChoice(
  userId: string,
  prompt: string,
  model: AgentModelChoice,
): Promise<
  | {
      ok: true;
      text: string;
      modelSource: AgentModelSource;
      providerKey: string | null;
      modelLabel: string | null;
    }
  | { ok: false; error: string; retryable?: boolean }
> {
  try {
    if (model.source === "browser") {
      return { ok: false, error: "Use o fluxo do navegador para este modelo." };
    }

    if (model.source === "platform") {
      if (!isPlatformGeminiConfigured()) {
        return { ok: false, error: "Gemini da plataforma não configurado." };
      }
      const text = await generateTextWithPlatformGemini(prompt);
      const cfg = readPlatformGeminiConfig();
      return {
        ok: true,
        text,
        modelSource: "platform",
        providerKey: null,
        modelLabel: cfg.model,
      };
    }

    if (!isAiProviderKey(model.providerKey)) {
      return { ok: false, error: "Provedor inválido." };
    }
    const credentials = await loadUserAiProviderCredentials(
      userId,
      model.providerKey,
    );
    if (!credentials) {
      return { ok: false, error: "Credenciais do provedor indisponíveis." };
    }
    const configError = validateUserProviderConfig(
      model.providerKey,
      credentials.defaultModel,
      credentials.baseUrl,
      model.model,
    );
    if (configError) {
      return { ok: false, error: configError.message };
    }
    const resolved = resolveModelForProvider(
      model.providerKey,
      credentials.defaultModel,
      model.model,
    );
    const text = await generateTextWithUserProvider(
      credentials,
      prompt,
      model.model,
    );
    return {
      ok: true,
      text,
      modelSource: "user_provider",
      providerKey: model.providerKey,
      modelLabel: resolved,
    };
  } catch (error) {
    if (error instanceof AiGenerateError) {
      return {
        ok: false,
        error: error.message,
        retryable: error.retryable,
      };
    }
    if (error instanceof CredentialsCryptoError) {
      return {
        ok: false,
        error:
          "Não foi possível decifrar o token do provedor. Verifique CREDENTIALS_ENCRYPTION_KEY.",
      };
    }
    if (error instanceof Error && error.message.trim()) {
      const aiErr = AiGenerateError.fromRaw(error.message.trim());
      return {
        ok: false,
        error: aiErr.message,
        retryable: aiErr.retryable,
      };
    }
    if (typeof error === "string" && error.trim()) {
      const aiErr = AiGenerateError.fromRaw(error.trim());
      return {
        ok: false,
        error: aiErr.message,
        retryable: aiErr.retryable,
      };
    }
    return { ok: false, error: "Falha ao gerar resposta." };
  }
}

function parseModelChoice(
  optionId: string,
  options: AgentModelOption[],
): AgentModelChoice | null {
  return parseAgentModelOptionId(optionId, options);
}

function titleFromMessage(text: string): string {
  const line = text.split("\n")[0]?.trim() ?? "Nova conversa";
  return line.length > 60 ? `${line.slice(0, 57)}…` : line;
}

async function ensureSession(input: {
  userId: string;
  sessionId?: string | null;
  workspaceId?: string | null;
  mode: AgentChatMode;
  firstMessage?: string;
}) {
  if (input.sessionId) {
    const existing = await findAgentSessionForUser(input.userId, input.sessionId);
    if (!existing) {
      return { error: "Sessão não encontrada." as const };
    }
    return { session: existing };
  }

  if (!input.workspaceId && input.mode !== "ask") {
    return { error: "Selecione um workspace." as const };
  }

  if (input.workspaceId) {
    const workspace = await findWorkspaceForUser(input.userId, input.workspaceId);
    if (!workspace) {
      return { error: "Workspace não encontrado." as const };
    }
  }

  const session = await createAgentSession({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    mode: input.mode,
    title: input.firstMessage ? titleFromMessage(input.firstMessage) : "Nova conversa",
  });
  return { session };
}

export type SendAgentMessageResult =
  | {
      ok: true;
      sessionId: string;
      modeOnly?: boolean;
      needsBrowser?: false;
      messages: AgentMessagePublic[];
    }
  | {
      ok: true;
      sessionId: string;
      needsBrowser: true;
      prompt: string;
      userMessageId: string;
    }
  | { ok: false; error: string; retryable?: boolean };

function buildAgentSkillPromptMeta(
  turn: ResolvedAgentSkillTurn,
  workspaceContext: Awaited<ReturnType<typeof loadAgentWorkspaceContext>> | null,
): { instruction: string; digest: string } {
  let presentLabels: string[] = [];
  let missingLabels: string[] = [];
  if (workspaceContext && turn.skill.metricKeys.length > 0) {
    const built = buildSkillChartPart({
      metricKeys: turn.skill.metricKeys,
      period: workspaceContext.period,
      metricDays: workspaceContext.metricDays,
      claritySnapshots: workspaceContext.claritySnapshots,
      sourceStatuses: workspaceContext.sourceStatuses,
      snapshotMetricValues: workspaceContext.snapshotMetricValues,
      skillName: turn.skill.name,
    });
    presentLabels = metricLabelsForKeys(built.presentKeys);
    missingLabels = metricLabelsForKeys(built.missingKeys);
  } else if (turn.skill.metricKeys.length > 0) {
    missingLabels = metricLabelsForKeys(turn.skill.metricKeys);
  }
  return {
    instruction: turn.skill.instruction,
    digest: buildAgentSkillDigestSection({
      skillName: turn.skill.name,
      periodLabel: workspaceContext?.periodLabel ?? null,
      presentLabels,
      missingLabels,
      hasWorkspace: Boolean(workspaceContext),
    }),
  };
}

export async function sendAgentMessage(input: {
  sessionId?: string | null;
  workspaceId?: string | null;
  mode: AgentChatMode;
  modelOptionId: string;
  text: string;
  chromeReady?: boolean;
}): Promise<SendAgentMessageResult> {
  const userId = await requireUserId();
  const userSkills = await listUserAgentSkillsForAgent(userId);
  const agentSkillTurn = resolveAgentSkillTurn(input.text, userSkills);
  const parsed = parseAgentInput(input.text);

  if (parsed.kind === "mode_only") {
    const ensured = await ensureSession({
      userId,
      sessionId: input.sessionId,
      workspaceId: input.workspaceId,
      mode: parsed.mode,
    });
    if ("error" in ensured) {
      return { ok: false, error: ensured.error ?? "Não foi possível abrir a sessão." };
    }
    await updateAgentSessionMeta({
      sessionId: ensured.session.id,
      mode: parsed.mode,
    });
    revalidateAgentNav(ensured.session.id);
    return {
      ok: true,
      sessionId: ensured.session.id,
      modeOnly: true,
      messages: (await listAgentMessages(ensured.session.id)).map(toMessagePublic),
    };
  }

  const messageText = parsed.text.trim();
  if (!messageText) {
    return { ok: false, error: "Digite uma mensagem." };
  }

  const mode = parsed.mode ?? input.mode;
  const workspaceCommand = parsed.workspaceCommand;

  if (
    mode === "ask" &&
    isWorkspaceCommandBlockedInAsk(workspaceCommand) &&
    !agentSkillTurn
  ) {
    const ensured = await ensureSession({
      userId,
      sessionId: input.sessionId,
      workspaceId: input.workspaceId,
      mode,
      firstMessage: messageText,
    });
    if ("error" in ensured) {
      return {
        ok: false,
        error: ensured.error ?? "Não foi possível abrir a sessão.",
      };
    }
    await appendAgentMessage({
      sessionId: ensured.session.id,
      role: "user",
      content: messageText,
    });
    await appendAgentMessage({
      sessionId: ensured.session.id,
      role: "assistant",
      content: ASK_WORKSPACE_BLOCK_MESSAGE,
    });
    revalidateAgentNav(ensured.session.id);
    return {
      ok: true,
      sessionId: ensured.session.id,
      messages: (await listAgentMessages(ensured.session.id)).map(toMessagePublic),
    };
  }

  const options = await listAgentModelOptions({
    chromeReady: input.chromeReady ?? false,
  });
  const modelChoice = parseModelChoice(input.modelOptionId, options);
  if (!modelChoice) {
    return { ok: false, error: "Modelo inválido." };
  }

  const ensured = await ensureSession({
    userId,
    sessionId: input.sessionId,
    workspaceId: input.workspaceId,
    mode,
    firstMessage: messageText,
  });
  if ("error" in ensured) {
    return {
      ok: false,
      error: ensured.error ?? "Não foi possível abrir a sessão.",
    };
  }
  const session = ensured.session;

  await updateAgentSessionMeta({ sessionId: session.id, mode });

  const userRow = await appendAgentMessage({
    sessionId: session.id,
    role: "user",
    content: messageText,
  });

  const discard = () =>
    discardFailedTurn({
      userId,
      sessionId: session.id,
      userMessageId: userRow.id,
      discardSession: !input.sessionId,
    });

  try {
    const result = await runAgentTurn({
      userId,
      session,
      mode,
      messageText,
      workspaceCommand,
      agentSkillTurn,
      modelChoice,
      userMessageId: userRow.id,
    });
    if (!result.ok) {
      await discard();
    }
    return result;
  } catch (error) {
    console.error("[agent] falha ao processar mensagem", error);
    await discard().catch(() => undefined);
    return {
      ok: false,
      error: "Não foi possível processar a mensagem. Tente novamente.",
      retryable: true,
    };
  }
}

async function runAgentTurn(input: {
  userId: string;
  session: AgentSessionRow;
  mode: AgentChatMode;
  messageText: string;
  workspaceCommand?: AgentWorkspaceCommand;
  agentSkillTurn: ResolvedAgentSkillTurn | null;
  modelChoice: AgentModelChoice;
  userMessageId: string;
}): Promise<SendAgentMessageResult> {
  const {
    userId,
    session,
    mode,
    messageText,
    workspaceCommand,
    agentSkillTurn,
    modelChoice,
    userMessageId,
  } = input;

  const observabilitySectionPromise = resolveObservabilityPromptSection(
    userId,
    session.workspaceId,
  );

  if (session.title === "Nova conversa") {
    await updateAgentSessionMeta({
      sessionId: session.id,
      title: titleFromMessage(messageText),
    });
  }

  const history = (await listAgentMessages(session.id))
    .filter((m) => m.id !== userMessageId)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  let workspaceContext = null;
  if ((mode !== "ask" || agentSkillTurn) && session.workspaceId) {
    const workspace = await findWorkspaceForUser(userId, session.workspaceId);
    if (workspace) {
      workspaceContext = await loadAgentWorkspaceContext({
        userId,
        workspaceId: session.workspaceId,
        workspaceName: workspace.name,
        command: workspaceCommand,
      });
    }
  }

  const knowledge =
    mode === "ask" && !agentSkillTurn
      ? defaultAgentKnowledgeRetriever.search(messageText)
      : [];

  const promptUserMessage = agentSkillTurn
    ? skillUserMessageForPrompt(agentSkillTurn.tail, agentSkillTurn.skill.name)
    : messageText;

  const agentSkillPrompt = agentSkillTurn
    ? buildAgentSkillPromptMeta(agentSkillTurn, workspaceContext)
    : null;

  const observabilitySection = await observabilitySectionPromise;

  const prompt = buildAgentPrompt({
    mode,
    userMessage: promptUserMessage,
    workspaceContext,
    workspaceCommand,
    knowledgeChunks: knowledge,
    history,
    agentSkill: agentSkillPrompt,
    observabilitySection,
  });

  if (modelChoice.source === "browser") {
    revalidateAgentNav(session.id);
    return {
      ok: true,
      sessionId: session.id,
      needsBrowser: true,
      prompt,
      userMessageId,
    };
  }

  const generated = await generateWithModelChoice(userId, prompt, modelChoice);
  if (!generated.ok) {
    if (
      workspaceContext &&
      workspaceCommand?.kind === "chart" &&
      mode !== "plan"
    ) {
      const chart = buildChartPartForWorkspaceCommand({
        workspaceCommand,
        markerMetric: null,
        period: workspaceContext.period,
        metricDays: workspaceContext.metricDays,
        sourceStatuses: workspaceContext.sourceStatuses,
        snapshotMetricValues: workspaceContext.snapshotMetricValues,
      });
      if (chart) {
        const content = [
          `Tendência de **${chart.title ?? chart.label}** (${workspaceContext.periodLabel}).`,
          "Não foi possível gerar o comentário automático; confira o gráfico abaixo.",
          `Detalhe: ${generated.error}`,
        ].join("\n\n");
        await appendAgentMessage({
          sessionId: session.id,
          role: "assistant",
          content,
          parts: { parts: [chart] },
        });
        revalidateAgentNav(session.id);
        return {
          ok: true,
          sessionId: session.id,
          messages: (await listAgentMessages(session.id)).map(toMessagePublic),
        };
      }
    }
    return {
      ok: false,
      error: generated.error,
      retryable: generated.retryable,
    };
  }

  const parts = await buildAssistantParts({
    mode,
    text: generated.text,
    workspaceContext,
    workspaceCommand,
    agentSkillTurn,
  });

  if (mode === "plan") {
    await markLatestPlanQuestionsAnswered(session.id);
  }

  await appendAgentMessage({
    sessionId: session.id,
    role: "assistant",
    content: parts.content,
    parts: parts.parts.length ? { parts: parts.parts } : null,
    modelSource: generated.modelSource,
    providerKey: generated.providerKey,
    model: generated.modelLabel,
  });

  await updateAgentSessionMeta({
    sessionId: session.id,
    lastModelSource: generated.modelSource,
    lastProviderKey: generated.providerKey,
    lastModel: generated.modelLabel,
  });

  if (session.workspaceId) {
    await createAiUsageLog({
      userId,
      workspaceId: session.workspaceId,
      purpose: "agent",
      route: generated.modelSource,
      providerKey: generated.providerKey,
      model: generated.modelLabel,
    }).catch(() => undefined);
  }

  revalidateAgentNav(session.id);

  return {
    ok: true,
    sessionId: session.id,
    messages: (await listAgentMessages(session.id)).map(toMessagePublic),
  };
}

async function markLatestPlanQuestionsAnswered(
  sessionId: string,
): Promise<void> {
  const rows = await listAgentMessages(sessionId);
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row.role !== "assistant") {
      continue;
    }
    const parts = parseMessageParts(row.partsJson);
    const hasOpen = parts.some(
      (p) => p.type === "plan_questions" && !p.answered,
    );
    if (!hasOpen) {
      return;
    }
    const marked: AgentMessageParts["parts"] = parts.map((p) =>
      p.type === "plan_questions" ? { ...p, answered: true } : p,
    );
    await updateAgentMessageParts({
      messageId: row.id,
      parts: { parts: marked },
    });
    return;
  }
}

async function buildAssistantParts(input: {
  mode: AgentChatMode;
  text: string;
  workspaceContext: Awaited<ReturnType<typeof loadAgentWorkspaceContext>>;
  workspaceCommand?: AgentWorkspaceCommand;
  replayArtifacts?: import("@/backend/lib/agent/types").AgentPlanArtifacts;
  agentSkillTurn?: ResolvedAgentSkillTurn | null;
}) {
  const built = buildAgentMessageParts({
    mode: input.mode,
    text: input.text,
    workspaceContext: input.workspaceContext,
    workspaceCommand: input.workspaceCommand,
    replayArtifacts: input.replayArtifacts,
    agentSkillTurn: input.agentSkillTurn,
  });

  if (input.mode === "plan" && !input.agentSkillTurn) {
    const turn = classifyPlanAssistantTurn(built.content);
    if (turn === "questions") {
      const questionsPart = parsePlanQuestionsFromText(built.content);
      if (questionsPart) {
        return {
          content: built.content,
          parts: [questionsPart],
        };
      }
      return { content: built.content, parts: [] };
    }
    const content = built.content;
    if (!isValidPlanMarkdown(content)) {
      return { content: built.content, parts: [] };
    }
    const planParts: AgentMessageParts["parts"] = [
      {
        type: "plan_pending",
        markdown: content,
        artifacts: built.artifacts,
        accepted: false,
      },
    ];
    return { content, parts: planParts };
  }

  return { content: built.content, parts: built.parts };
}

function appendWorkflowPartToDelivery(
  parts: AgentMessageParts["parts"],
  planMarkdown: string,
): AgentMessageParts["parts"] {
  const fromPlan = buildWorkflowPartFromPlanMarkdown(planMarkdown);
  if (fromPlan) {
    return [fromPlan, ...parts];
  }
  const actionPlan = parts.find((p) => p.type === "action_plan");
  if (actionPlan?.type === "action_plan") {
    const fromActions = buildWorkflowPartFromActionPlanItems(actionPlan.items);
    if (fromActions) {
      return [fromActions, ...parts];
    }
  }
  return parts;
}

export async function completeBrowserAgentTurn(input: {
  sessionId: string;
  userMessageId: string;
  text: string;
  mode: AgentChatMode;
}): Promise<
  | { ok: true; messages: AgentMessagePublic[] }
  | { ok: false; error: string; retryable?: boolean }
> {
  const userId = await requireUserId();
  const session = await findAgentSessionForUser(userId, input.sessionId);
  if (!session) {
    return { ok: false, error: "Sessão não encontrada." };
  }

  const userSkills = await listUserAgentSkillsForAgent(userId);
  const allMessages = await listAgentMessages(session.id);
  const userMessage = allMessages.find((m) => m.id === input.userMessageId);
  const agentSkillTurn = userMessage
    ? resolveAgentSkillTurn(userMessage.content, userSkills)
    : null;
  const parsedUser = userMessage
    ? parseAgentInput(userMessage.content)
    : null;
  const workspaceCommand =
    parsedUser?.kind === "message" ? parsedUser.workspaceCommand : undefined;

  let replayArtifacts:
    | import("@/backend/lib/agent/types").AgentPlanArtifacts
    | undefined;
  if (userMessage) {
    const refParts = parseMessageParts(userMessage.partsJson);
    const pending = refParts.find((p) => p.type === "plan_pending");
    if (pending?.type === "plan_pending") {
      replayArtifacts = pending.artifacts;
    }
  }

  let workspaceContext = null;
  if ((input.mode !== "ask" || agentSkillTurn) && session.workspaceId) {
    const workspace = await findWorkspaceForUser(userId, session.workspaceId);
    if (workspace) {
      workspaceContext = await loadAgentWorkspaceContext({
        userId,
        workspaceId: session.workspaceId,
        workspaceName: workspace.name,
        command: workspaceCommand,
      });
    }
  }

  const parts = await buildAssistantParts({
    mode: input.mode,
    text: input.text,
    workspaceContext,
    workspaceCommand,
    replayArtifacts,
    agentSkillTurn,
  });

  if (input.mode === "plan") {
    await markLatestPlanQuestionsAnswered(session.id);
  }

  await appendAgentMessage({
    sessionId: session.id,
    role: "assistant",
    content: parts.content,
    parts: parts.parts.length ? { parts: parts.parts } : null,
    modelSource: "browser",
    providerKey: null,
    model: "chrome-prompt",
  });

  await updateAgentSessionMeta({
    sessionId: session.id,
    lastModelSource: "browser",
    lastProviderKey: null,
    lastModel: "chrome-prompt",
  });

  revalidateAgentNav(input.sessionId);

  return {
    ok: true,
    messages: (await listAgentMessages(session.id)).map(toMessagePublic),
  };
}

/** Desfaz um turno do navegador que falhou no client (só a última mensagem do usuário). */
export async function discardAgentTurn(input: {
  sessionId: string;
  userMessageId: string;
  discardSession?: boolean;
}): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const session = await findAgentSessionForUser(userId, input.sessionId);
  if (!session) {
    return { ok: false };
  }
  const messages = await listAgentMessages(session.id);
  const last = messages.at(-1);
  if (!last || last.id !== input.userMessageId || last.role !== "user") {
    return { ok: false };
  }
  await discardFailedTurn({
    userId,
    sessionId: session.id,
    userMessageId: last.id,
    discardSession: input.discardSession ?? false,
  });
  return { ok: true };
}

export async function approveAgentPlan(input: {
  sessionId: string;
  planMessageId: string;
  modelOptionId: string;
  chromeReady?: boolean;
}): Promise<SendAgentMessageResult> {
  const userId = await requireUserId();
  const session = await findAgentSessionForUser(userId, input.sessionId);
  if (!session) {
    return { ok: false, error: "Sessão não encontrada." };
  }

  const messages = await listAgentMessages(session.id);
  const planMessage = messages.find((m) => m.id === input.planMessageId);
  if (!planMessage) {
    return { ok: false, error: "Plano não encontrado." };
  }

  const parts = parseMessageParts(planMessage.partsJson);
  const pending = parts.find((p) => p.type === "plan_pending");
  if (!pending || pending.type !== "plan_pending") {
    return { ok: false, error: "Esta mensagem não contém um plano pendente." };
  }

  let workspaceContext = null;
  const observabilitySectionPromise = resolveObservabilityPromptSection(
    userId,
    session.workspaceId,
  );
  if (session.workspaceId) {
    const workspace = await findWorkspaceForUser(userId, session.workspaceId);
    if (workspace) {
      workspaceContext = await loadAgentWorkspaceContext({
        userId,
        workspaceId: session.workspaceId,
        workspaceName: workspace.name,
      });
    }
  }

  const observabilitySection = await observabilitySectionPromise;

  const prompt = buildAgentPrompt({
    mode: "agent",
    userMessage: "Execute o plano aceito.",
    workspaceContext,
    history: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    approvedPlanMarkdown: pending.markdown,
    observabilitySection,
  });

  const options = await listAgentModelOptions({
    chromeReady: input.chromeReady ?? false,
  });
  const modelChoice = parseModelChoice(input.modelOptionId, options);
  if (!modelChoice) {
    return { ok: false, error: "Modelo inválido." };
  }

  if (modelChoice.source === "browser") {
    return {
      ok: true,
      sessionId: session.id,
      needsBrowser: true,
      prompt,
      userMessageId: planMessage.id,
    };
  }

  const generated = await generateWithModelChoice(userId, prompt, modelChoice);
  if (!generated.ok) {
    return {
      ok: false,
      error: generated.error,
      retryable: generated.retryable,
    };
  }

  const fallbackArtifacts = pending.artifacts ?? {
    chartMetrics: [],
    projectionMetrics: [],
    funnel: false,
    actionPlan: false,
  };
  const fromDelivery = computeArtifactsFromText({ text: generated.text });
  const mergedArtifacts = mergePlanArtifacts(fromDelivery, fallbackArtifacts);

  const built = await buildAssistantParts({
    mode: "agent",
    text: generated.text,
    workspaceContext,
    replayArtifacts: mergedArtifacts,
  });

  const deliveryParts = appendWorkflowPartToDelivery(
    built.parts,
    pending.markdown,
  );

  await appendAgentMessage({
    sessionId: session.id,
    role: "assistant",
    content: built.content,
    parts: deliveryParts.length ? { parts: deliveryParts } : null,
    modelSource: generated.modelSource,
    providerKey: generated.providerKey,
    model: generated.modelLabel,
  });

  const markedPlanParts: AgentMessageParts["parts"] = parts.map((p) =>
    p.type === "plan_pending" ? { ...p, accepted: true } : p,
  );
  await updateAgentMessageParts({
    messageId: planMessage.id,
    parts: { parts: markedPlanParts },
  });

  revalidateAgentNav(session.id);

  return {
    ok: true,
    sessionId: session.id,
    messages: (await listAgentMessages(session.id)).map(toMessagePublic),
  };
}
