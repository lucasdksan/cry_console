"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  approveAgentPlan,
  completeBrowserAgentTurn,
  deleteAgentSessionAction,
  listAgentModelOptions,
  renameAgentSessionAction,
  sendAgentMessage,
  type AgentModelOption,
} from "@/backend/controllers/agent.controller";
import type {
  AgentMessagePublic,
  AgentSessionPublic,
} from "@/backend/lib/agent/types";
import { parseAgentInput } from "@/backend/lib/agent/command";
import type { AgentChatMode } from "@/generated/prisma/client";
import { BrandLogo } from "@/frontend/components/atoms/brand-logo";
import { AgentMessageBubble } from "@/frontend/components/molecules/agent-message-bubble";
import { AgentComposer } from "@/frontend/components/organisms/agent-composer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/frontend/components/ui/alert-dialog";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import {
  generateChromePromptText,
  checkChromePromptReady,
} from "@/frontend/lib/browser/prompt";
import { useAgentNavRefresh } from "@/frontend/lib/agent/nav-sync";

type AgentChatBoardProps = {
  session: AgentSessionPublic | null;
  initialMessages: AgentMessagePublic[];
  workspaces: { id: string; name: string }[];
};

export function AgentChatBoard({
  session,
  initialMessages,
  workspaces,
}: AgentChatBoardProps) {
  const router = useRouter();
  const refreshAgentNav = useAgentNavRefresh();
  const [messages, setMessages] = React.useState(initialMessages);
  const [mode, setMode] = React.useState<AgentChatMode>(
    session?.mode ?? "agent",
  );
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(
    session?.workspaceId ?? workspaces[0]?.id ?? null,
  );
  const [modelOptions, setModelOptions] = React.useState<AgentModelOption[]>(
    [],
  );
  const [modelOptionId, setModelOptionId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [thinkingTick, setThinkingTick] = React.useState(0);
  const [approvingPlanId, setApprovingPlanId] = React.useState<string | null>(
    null,
  );
  const sessionTitleRef = React.useRef<EditableSessionTitleHandle>(null);
  const [sessionTitleEditing, setSessionTitleEditing] = React.useState(false);

  const isEmpty = messages.length === 0;
  const showLanding = isEmpty && !session;

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const chromeReady = await checkChromePromptReady();
      const options = await listAgentModelOptions({ chromeReady });
      if (cancelled) {
        return;
      }
      setModelOptions(options);
      setModelOptionId((prev) =>
        prev && options.some((o) => o.id === prev)
          ? prev
          : (options[0]?.id ?? ""),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!busy) {
      return;
    }
    const timer = window.setInterval(() => {
      setThinkingTick((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const displayThinking = busy ? thinkingTick : undefined;

  const composerProps = {
    mode,
    onModeChange: setMode,
    modelOptionId,
    onModelOptionIdChange: setModelOptionId,
    modelOptions,
    workspaceId,
    onWorkspaceIdChange: session ? undefined : setWorkspaceId,
    workspaceChoices: workspaces,
    workspaceLocked: Boolean(session),
    disabled: busy,
    thinkingSeconds: displayThinking,
    onQuickCommand: (value: string) => void handleSend(value),
    onSubmit: (value: string) => void handleSend(value),
  };

  async function runBrowserGeneration(input: {
    sessionId: string;
    userMessageId: string;
    prompt: string;
    mode: AgentChatMode;
  }) {
    const text = await generateChromePromptText(input.prompt);
    const completed = await completeBrowserAgentTurn({
      sessionId: input.sessionId,
      userMessageId: input.userMessageId,
      text,
      mode: input.mode,
    });
    if (!completed.ok) {
      throw new Error(completed.error);
    }
    setMessages(completed.messages);
  }

  async function handleSend(text: string) {
    const parsed = parseAgentInput(text);
    if (parsed.kind === "mode_only") {
      setMode(parsed.mode);
      if (session) {
        setBusy(true);
        setThinkingTick(0);
        const result = await sendAgentMessage({
          sessionId: session.id,
          mode: parsed.mode,
          modelOptionId,
          text,
          chromeReady: await checkChromePromptReady(),
        });
        setBusy(false);
        if (result.ok && "messages" in result) {
          setMessages(result.messages);
          await refreshAgentNav();
        }
      }
      return;
    }

    if (mode !== "ask" && !session && !workspaceId) {
      return;
    }
    if (mode !== "ask" && session?.workspaceId === null && !workspaceId) {
      return;
    }

    setBusy(true);
    setThinkingTick(0);
    try {
      const chromeReady = await checkChromePromptReady();
      const result = await sendAgentMessage({
        sessionId: session?.id,
        workspaceId: session?.workspaceId ?? workspaceId,
        mode,
        modelOptionId,
        text,
        chromeReady,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      if (!session && result.sessionId) {
        await refreshAgentNav();
        router.push(`/agente/${result.sessionId}`);
        router.refresh();
        return;
      }

      if (result.needsBrowser) {
        await runBrowserGeneration({
          sessionId: result.sessionId,
          userMessageId: result.userMessageId,
          prompt: result.prompt,
          mode,
        });
      } else if (result.messages) {
        setMessages(result.messages);
      }

      await refreshAgentNav();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível enviar.";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message,
          parts: [],
          modelSource: null,
          providerKey: null,
          model: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function handleApprovePlan(messageId: string) {
    if (!session) {
      return;
    }
    setApprovingPlanId(messageId);
    setBusy(true);
    setThinkingTick(0);
    try {
      const chromeReady = await checkChromePromptReady();
      const result = await approveAgentPlan({
        sessionId: session.id,
        planMessageId: messageId,
        modelOptionId,
        chromeReady,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      if (result.needsBrowser) {
        await runBrowserGeneration({
          sessionId: result.sessionId,
          userMessageId: result.userMessageId,
          prompt: result.prompt,
          mode: "agent",
        });
      } else if ("messages" in result && result.messages) {
        setMessages(result.messages);
      }
      await refreshAgentNav();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao aprovar plano.";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message,
          parts: [],
          modelSource: null,
          providerKey: null,
          model: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setApprovingPlanId(null);
      setBusy(false);
    }
  }

  async function handleDeleteSession() {
    if (!session) {
      return;
    }
    const result = await deleteAgentSessionAction(session.id);
    if (result.ok) {
      await refreshAgentNav();
      router.push("/agente");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      {session && !showLanding ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <EditableSessionTitle
            ref={sessionTitleRef}
            key={session.id}
            sessionId={session.id}
            initialTitle={session.title}
            workspaceName={session.workspaceName}
            onEditingChange={setSessionTitleEditing}
          />
          <div className="flex shrink-0 items-center gap-2">
            {!sessionTitleEditing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => sessionTitleRef.current?.startEditing()}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
            ) : null}
            <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
              <Trash2 className="size-4" />
              Excluir
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta conversa será removida permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleDeleteSession()}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </header>
      ) : null}

      {showLanding ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:py-10">
          <div className="flex w-full max-w-2xl flex-col gap-5">
            <div className="flex flex-row items-center justify-center gap-4 text-left sm:gap-5">
              <BrandLogo showName={false} size="xl" className="shrink-0" />
              <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
                O que podemos fazer?
              </h1>
            </div>
            <AgentComposer variant="centered" {...composerProps} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-4 px-4 py-4">
            {messages.map((message) => (
              <AgentMessageBubble
                key={message.id}
                message={message}
                onApprovePlan={handleApprovePlan}
                approvingPlanId={approvingPlanId}
              />
            ))}
          </div>
          <div className="sticky bottom-0 z-10 -mx-4 bg-gradient-to-t from-background via-background/80 to-transparent px-4 pt-8 sm:-mx-6 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <AgentComposer variant="footer" {...composerProps} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type EditableSessionTitleHandle = {
  startEditing: () => void;
};

const EditableSessionTitle = React.forwardRef<
  EditableSessionTitleHandle,
  {
    sessionId: string;
    initialTitle: string;
    workspaceName: string | null;
    onEditingChange?: (editing: boolean) => void;
  }
>(function EditableSessionTitle(
  { sessionId, initialTitle, workspaceName, onEditingChange },
  ref,
) {
  const router = useRouter();
  const refreshAgentNav = useAgentNavRefresh();
  const [title, setTitle] = React.useState(initialTitle);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(initialTitle);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useImperativeHandle(
    ref,
    () => ({
      startEditing: () => {
        setDraft(title);
        setError(null);
        setEditing(true);
      },
    }),
    [title],
  );

  React.useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);

  async function handleSave() {
    if (saving) {
      return;
    }
    const trimmed = draft.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      setError("Dê um nome para a conversa.");
      return;
    }
    if (trimmed.length > 80) {
      setError("O nome deve ter até 80 caracteres.");
      return;
    }
    if (trimmed === title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await renameAgentSessionAction(sessionId, trimmed);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle(result.title);
    setEditing(false);
    await refreshAgentNav();
    router.refresh();
  }

  return (
    <div className="min-w-0 flex-1">
      {editing ? (
        <form
          className="flex max-w-md items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <Input
            value={draft}
            maxLength={80}
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraft(title);
                setError(null);
                setEditing(false);
              }
            }}
            placeholder="Nome da conversa"
            aria-label="Nome da conversa"
            className="h-9"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={saving}
            aria-label="Salvar nome"
            className="size-9 shrink-0"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={saving}
            aria-label="Cancelar edição"
            className="size-9 shrink-0"
            onClick={() => {
              setDraft(title);
              setError(null);
              setEditing(false);
            }}
          >
            <X className="size-4" />
          </Button>
        </form>
      ) : (
        <h1 className="truncate text-lg font-semibold tracking-tight">
          {title}
        </h1>
      )}
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {workspaceName ?? "Sessão do agente"}
        </p>
      )}
    </div>
  );
});
