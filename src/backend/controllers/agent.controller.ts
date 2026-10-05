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
  extractChartMarker,
} from "@/backend/lib/agent/chart";
import {
  loadAgentWorkspaceContext,
} from "@/backend/lib/agent/context";
import { defaultAgentKnowledgeRetriever } from "@/backend/lib/agent/knowledge";
import {
  buildAgentPrompt,
  isValidPlanMarkdown,
} from "@/backend/lib/agent/prompt";
import { revalidateAgentNav } from "@/backend/lib/agent/revalidate-nav";
import type {
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
  labelForAiProvider,
  isAiProviderKey,
} from "@/backend/lib/ai/provider-catalog";
import {
  resolveModelForProvider,
  validateUserProviderConfig,
} from "@/backend/lib/ai/route";
import { CredentialsCryptoError } from "@/backend/lib/account/credentials-crypto";
import {
  appendAgentMessage,
  createAgentSession,
  deleteAgentSessionForUser,
  findAgentSessionForUser,
  listAgentMessages,
  listAgentSessionsForUser,
  parseMessageParts,
  updateAgentSessionMeta,
} from "@/backend/models/agent-session.model";
import { createAiUsageLog } from "@/backend/models/workspace-analysis.model";
import {
  loadUserAiProviderCredentials,
  listUserAiProvidersForRouting,
} from "@/backend/models/user-ai-provider.model";
import { findWorkspaceForUser } from "@/backend/models/workspace.model";
import type { AgentChatMode, AgentModelSource } from "@/generated/prisma/client";

export type AgentModelOption = {
  id: string;
  label: string;
  source: AgentModelSource;
  providerKey?: string;
  defaultModel?: string | null;
};

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
  const options: AgentModelOption[] = [];

  for (const provider of providers) {
    if (!provider.hasApiToken || !isAiProviderKey(provider.providerKey)) {
      continue;
    }
    options.push({
      id: `user:${provider.providerKey}`,
      label: labelForAiProvider(provider.providerKey),
      source: "user_provider",
      providerKey: provider.providerKey,
      defaultModel: provider.defaultModel,
    });
  }

  if (isPlatformGeminiConfigured()) {
    const platform = readPlatformGeminiConfig();
    options.push({
      id: "platform",
      label: "Meu modelo (Gemini)",
      source: "platform",
      defaultModel: platform.model,
    });
  }

  if (input.chromeReady) {
    options.push({
      id: "browser",
      label: "Nativo do navegador",
      source: "browser",
    });
  }

  return options;
}

export async function getAgentSessionDetail(sessionId: string): Promise<
  | {
      ok: true;
      session: AgentSessionPublic;
      messages: AgentMessagePublic[];
    }
  | { ok: false; error: string }
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
  | { ok: false; error: string }
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
      return { ok: false, error: error.message };
    }
    if (error instanceof CredentialsCryptoError) {
      return {
        ok: false,
        error:
          "Não foi possível decifrar o token do provedor. Verifique CREDENTIALS_ENCRYPTION_KEY.",
      };
    }
    if (error instanceof Error && error.message.trim()) {
      return { ok: false, error: error.message.trim() };
    }
    if (typeof error === "string" && error.trim()) {
      return { ok: false, error: error.trim() };
    }
    return { ok: false, error: "Falha ao gerar resposta." };
  }
}

function parseModelChoice(
  optionId: string,
  options: AgentModelOption[],
): AgentModelChoice | null {
  if (optionId === "browser") {
    return { source: "browser" };
  }
  if (optionId === "platform") {
    return { source: "platform" };
  }
  if (optionId.startsWith("user:")) {
    const providerKey = optionId.slice("user:".length);
    const match = options.find((o) => o.id === optionId);
    return {
      source: "user_provider",
      providerKey,
      model: match?.defaultModel,
    };
  }
  return null;
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
  | { ok: false; error: string };

export async function sendAgentMessage(input: {
  sessionId?: string | null;
  workspaceId?: string | null;
  mode: AgentChatMode;
  modelOptionId: string;
  text: string;
  chromeReady?: boolean;
}): Promise<SendAgentMessageResult> {
  const userId = await requireUserId();
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
    isWorkspaceCommandBlockedInAsk(workspaceCommand)
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

  const options = await listAgentModelOptions({
    chromeReady: input.chromeReady ?? false,
  });
  const modelChoice = parseModelChoice(input.modelOptionId, options);
  if (!modelChoice) {
    return { ok: false, error: "Modelo inválido." };
  }

  const userRow = await appendAgentMessage({
    sessionId: session.id,
    role: "user",
    content: messageText,
  });

  if (session.title === "Nova conversa") {
    await updateAgentSessionMeta({
      sessionId: session.id,
      title: titleFromMessage(messageText),
    });
  }

  const history = (await listAgentMessages(session.id))
    .filter((m) => m.id !== userRow.id)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  let workspaceContext = null;
  if (mode !== "ask" && session.workspaceId) {
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
    mode === "ask"
      ? defaultAgentKnowledgeRetriever.search(messageText)
      : [];

  const prompt = buildAgentPrompt({
    mode,
    userMessage: messageText,
    workspaceContext,
    workspaceCommand,
    knowledgeChunks: knowledge,
    history,
  });

  if (modelChoice.source === "browser") {
    revalidateAgentNav(session.id);
    return {
      ok: true,
      sessionId: session.id,
      needsBrowser: true,
      prompt,
      userMessageId: userRow.id,
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
          `Tendência de **${chart.label}** (${workspaceContext.periodLabel}).`,
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
    return { ok: false, error: generated.error };
  }

  const parts = await buildAssistantParts({
    mode,
    text: generated.text,
    workspaceContext,
    workspaceCommand,
  });

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

async function buildAssistantParts(input: {
  mode: AgentChatMode;
  text: string;
  workspaceContext: Awaited<ReturnType<typeof loadAgentWorkspaceContext>>;
  workspaceCommand?: AgentWorkspaceCommand;
}) {
  const { cleanedText, metricKey: markerMetric } = extractChartMarker(input.text);
  let content = cleanedText || input.text.trim();
  const parts: import("@/backend/lib/agent/types").AgentMessageParts["parts"] = [];

  if (input.mode === "plan") {
    if (!isValidPlanMarkdown(content)) {
      content = `# Plano proposto\n\n${content}`;
    }
    parts.push({ type: "plan_pending", markdown: content });
    return { content, parts };
  }

  if (input.workspaceContext) {
    const chart = buildChartPartForWorkspaceCommand({
      workspaceCommand: input.workspaceCommand,
      markerMetric,
      period: input.workspaceContext.period,
      metricDays: input.workspaceContext.metricDays,
      sourceStatuses: input.workspaceContext.sourceStatuses,
      snapshotMetricValues: input.workspaceContext.snapshotMetricValues,
    });
    if (chart) {
      parts.push(chart);
    } else if (
      input.workspaceCommand?.kind === "chart" ||
      input.workspaceCommand?.kind === "search"
    ) {
      content += "\n\n_(Série indisponível no período salvo.)_";
    }
  }

  return { content, parts };
}

export async function completeBrowserAgentTurn(input: {
  sessionId: string;
  userMessageId: string;
  text: string;
  mode: AgentChatMode;
}): Promise<
  | { ok: true; messages: AgentMessagePublic[] }
  | { ok: false; error: string }
> {
  const userId = await requireUserId();
  const session = await findAgentSessionForUser(userId, input.sessionId);
  if (!session) {
    return { ok: false, error: "Sessão não encontrada." };
  }

  const allMessages = await listAgentMessages(session.id);
  const userMessage = allMessages.find((m) => m.id === input.userMessageId);
  const parsedUser = userMessage
    ? parseAgentInput(userMessage.content)
    : null;
  const workspaceCommand =
    parsedUser?.kind === "message" ? parsedUser.workspaceCommand : undefined;

  let workspaceContext = null;
  if (input.mode !== "ask" && session.workspaceId) {
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
  });

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

  const prompt = buildAgentPrompt({
    mode: "agent",
    userMessage: "Execute o plano aceito.",
    workspaceContext,
    history: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    approvedPlanMarkdown: pending.markdown,
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
    return { ok: false, error: generated.error };
  }

  const built = await buildAssistantParts({
    mode: "agent",
    text: generated.text,
    workspaceContext,
  });

  await appendAgentMessage({
    sessionId: session.id,
    role: "assistant",
    content: built.content,
    parts: built.parts.length ? { parts: built.parts } : null,
    modelSource: generated.modelSource,
    providerKey: generated.providerKey,
    model: generated.modelLabel,
  });

  revalidateAgentNav(session.id);

  return {
    ok: true,
    sessionId: session.id,
    messages: (await listAgentMessages(session.id)).map(toMessagePublic),
  };
}
