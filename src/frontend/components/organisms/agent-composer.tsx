"use client";

import { ArrowUp, Bot, FolderOpen, Loader2, Paperclip, Store, X } from "lucide-react";
import * as React from "react";

import type { AgentChatMode } from "@/generated/prisma/client";
import type { AgentModelOption } from "@/backend/controllers/agent.controller";
import {
  AGENT_PRIMARY_CHIPS,
  AGENT_SLASH_CATALOG,
  slashSendText,
} from "@/backend/lib/agent/command";
import { AGENT_MODE_META } from "@/backend/lib/agent/types";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/frontend/components/ui/select";
import { Textarea } from "@/frontend/components/ui/textarea";
import { AgentContextBar } from "@/frontend/components/molecules/agent-context-bar";
import {
  appendAttachmentsToMessage,
  readAgentTextAttachments,
  type AgentTextAttachment,
} from "@/frontend/lib/agent/attachments";
import { formatAgentModelTriggerLabel } from "@/frontend/lib/agent/model-label";
import { cn } from "@/frontend/lib/utils";

type AgentComposerProps = {
  variant?: "footer" | "centered";
  mode: AgentChatMode;
  onModeChange: (mode: AgentChatMode) => void;
  modelOptionId: string;
  onModelOptionIdChange: (id: string) => void;
  modelOptions: AgentModelOption[];
  workspaceId: string | null;
  onWorkspaceIdChange?: (id: string | null) => void;
  workspaceChoices: { id: string; name: string }[];
  workspaceLocked?: boolean;
  disabled?: boolean;
  thinkingSeconds?: number;
  onQuickCommand?: (text: string) => void;
  onSubmit: (text: string) => void;
};

function workspaceDisplayName(
  workspaceId: string | null,
  workspaceChoices: { id: string; name: string }[],
  mode: AgentChatMode,
): string {
  const match = workspaceChoices.find((w) => w.id === workspaceId);
  if (match) {
    return match.name;
  }
  if (mode === "ask") {
    return "Sem loja (Ask)";
  }
  if (workspaceId) {
    return "Loja selecionada";
  }
  return "Workspace";
}

export function AgentComposer({
  variant = "footer",
  mode,
  onModeChange,
  modelOptionId,
  onModelOptionIdChange,
  modelOptions,
  workspaceId,
  onWorkspaceIdChange,
  workspaceChoices,
  workspaceLocked = false,
  disabled = false,
  thinkingSeconds,
  onQuickCommand,
  onSubmit,
}: AgentComposerProps) {
  const [text, setText] = React.useState("");
  const [attachments, setAttachments] = React.useState<AgentTextAttachment[]>(
    [],
  );
  const [attachError, setAttachError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showSlash =
    text.startsWith("/") && !text.includes("\n") && text.length <= 32;

  const selectedModel = modelOptions.find((o) => o.id === modelOptionId);
  const workspaceLabel = workspaceDisplayName(
    workspaceId,
    workspaceChoices,
    mode,
  );

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }
    setAttachError(null);
    const result = await readAgentTextAttachments(fileList);
    if (result.error) {
      setAttachError(result.error);
      return;
    }
    setAttachments((prev) =>
      [...prev, ...result.attachments].slice(0, 4),
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled) {
      return;
    }
    const payload = appendAttachmentsToMessage(trimmed, attachments);
    onSubmit(payload);
    setText("");
    setAttachments([]);
    setAttachError(null);
  }

  function prefillOrSend(commandText: string) {
    if (onQuickCommand) {
      onQuickCommand(commandText);
      return;
    }
    setText(commandText);
  }

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        void handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "flex w-full flex-col gap-3",
        variant === "footer" &&
          "bg-transparent p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        variant === "centered" && "bg-transparent p-0",
      )}
    >
      {showSlash ? (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-muted/40 p-2 text-xs">
          {AGENT_SLASH_CATALOG.filter((c) =>
            c.slash.startsWith(text.toLowerCase()),
          ).map((item) => (
            <li key={item.slash} className="px-2 py-1 text-muted-foreground">
              <button
                type="button"
                className="text-left"
                onClick={() => setText(slashSendText(item))}
              >
                <span className="font-medium text-foreground">{item.slash}</span>{" "}
                — {item.hint}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="rounded-2xl border border-border/70 bg-card/70 p-3 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((file) => (
              <Badge key={file.name} variant="secondary" className="gap-1 pr-1">
                {file.name}
                <button
                  type="button"
                  aria-label={`Remover ${file.name}`}
                  className="rounded-sm hover:bg-muted"
                  onClick={() =>
                    setAttachments((prev) =>
                      prev.filter((item) => item.name !== file.name),
                    )
                  }
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
        {attachError ? (
          <p className="mb-2 text-xs text-destructive">{attachError}</p>
        ) : null}

        <div className="relative">
          {!text.trim() ? (
            <div className="pointer-events-none absolute right-0 top-0 hidden max-w-[13rem] flex-wrap justify-end gap-1 sm:flex">
              {AGENT_PRIMARY_CHIPS.map((chip) =>
                chip.chipLabel ? (
                  <button
                    key={chip.slash}
                    type="button"
                    className="pointer-events-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    onClick={() => prefillOrSend(slashSendText(chip))}
                  >
                    {chip.slash}
                  </button>
                ) : null,
              )}
            </div>
          ) : null}

          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Descreva uma tarefa ou experimente um comando"
            rows={variant === "centered" ? 5 : 3}
            disabled={disabled}
            className={cn(
              "max-h-64 min-h-[5.5rem] resize-none overflow-y-auto border-0 bg-transparent px-0 pt-1 shadow-none focus-visible:ring-0 sm:min-h-[6rem]",
              !text.trim() && "sm:pr-52",
            )}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
          <div className="flex min-w-0 items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.csv,.json"
              multiple
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label="Anexar arquivo"
              className="size-8 shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            {!workspaceLocked && onWorkspaceIdChange ? (
              <Select
                value={workspaceId ?? "none"}
                onValueChange={(value) =>
                  onWorkspaceIdChange(value === "none" ? null : value)
                }
                disabled={disabled}
              >
                <SelectTrigger
                  size="sm"
                  className="h-8 max-w-[min(11rem,38vw)] border-0 bg-transparent text-muted-foreground shadow-none"
                >
                  <Store className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{workspaceLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {mode === "ask" ? (
                    <SelectItem value="none">Sem loja (Ask)</SelectItem>
                  ) : null}
                  {workspaceChoices.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="inline-flex h-8 max-w-[min(11rem,38vw)] items-center gap-1.5 truncate rounded-md px-1.5 text-sm text-muted-foreground">
                <FolderOpen className="size-3.5 shrink-0" />
                <span className="truncate">{workspaceLabel}</span>
              </span>
            )}
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            {thinkingSeconds !== undefined && disabled ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Pensando… {thinkingSeconds}s
              </span>
            ) : null}
            <Select
              value={mode}
              onValueChange={(value) => onModeChange(value as AgentChatMode)}
              disabled={disabled}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-fit max-w-[7.5rem] border-0 bg-transparent text-muted-foreground shadow-none"
              >
                <Bot className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">
                  {(AGENT_MODE_META[mode] ?? AGENT_MODE_META.agent).label}
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(AGENT_MODE_META) as AgentChatMode[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      <span className="font-medium">
                        {AGENT_MODE_META[key].label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {AGENT_MODE_META[key].description}
                      </span>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Select
              value={modelOptionId}
              onValueChange={(value) => onModelOptionIdChange(value ?? "")}
              disabled={disabled || modelOptions.length === 0}
            >
              <SelectTrigger
                size="sm"
                className="h-8 max-w-[min(12rem,40vw)] border-0 bg-transparent text-muted-foreground shadow-none"
              >
                <span className="truncate text-sm">
                  {formatAgentModelTriggerLabel(selectedModel)}
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                {modelOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {formatAgentModelTriggerLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              size="icon"
              disabled={
                disabled ||
                (!text.trim() && attachments.length === 0) ||
                modelOptions.length === 0
              }
              className="size-9 shrink-0 rounded-full"
            >
              {disabled ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <AgentContextBar
        mode={mode}
        onModeChange={onModeChange}
        workspaceId={workspaceId}
        onWorkspaceIdChange={onWorkspaceIdChange}
        workspaceChoices={workspaceChoices}
        workspaceLocked={workspaceLocked}
        disabled={disabled}
        onQuickCommand={(value) => prefillOrSend(value)}
      />
    </form>
  );
}
