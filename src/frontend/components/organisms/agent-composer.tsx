"use client";

import { ArrowUp, Loader2, Paperclip, X } from "lucide-react";
import * as React from "react";

import type { AgentChatMode } from "@/generated/prisma/client";
import type { AgentModelOption } from "@/backend/controllers/agent.controller";
import {
  AGENT_PRIMARY_CHIPS,
  AGENT_SLASH_CATALOG,
  slashSendText,
  type AgentSlashCatalogEntry,
} from "@/backend/lib/agent/command";
import type { UserAgentSkillSlashPublic } from "@/backend/models/user-agent-skill.model";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/frontend/components/ui/select";
import { Textarea } from "@/frontend/components/ui/textarea";
import { AgentContextBar } from "@/frontend/components/molecules/agent-context-bar";
import { AgentModeSelect } from "@/frontend/components/molecules/agent-mode-select";
import { AgentWorkspaceSelect } from "@/frontend/components/molecules/agent-workspace-select";
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
  skillSlashCatalog?: UserAgentSkillSlashPublic[];
  initialText?: string;
};

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
  skillSlashCatalog = [],
  initialText = "",
}: AgentComposerProps) {
  const [text, setText] = React.useState(initialText);
  const [attachments, setAttachments] = React.useState<AgentTextAttachment[]>(
    [],
  );
  const [attachError, setAttachError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const slashQuery = text.startsWith("/") ? text.toLowerCase() : "";
  const showSlash =
    slashQuery.length > 0 &&
    !text.includes("\n") &&
    !text.slice(1).includes(" ");

  const slashEntries = React.useMemo((): AgentSlashCatalogEntry[] => {
    const skillEntries: AgentSlashCatalogEntry[] = skillSlashCatalog.map(
      (skill) => ({
        slash: `/${skill.slug}`,
        hint: skill.name,
      }),
    );
    return [...AGENT_SLASH_CATALOG, ...skillEntries];
  }, [skillSlashCatalog]);

  const selectedModel = modelOptions.find((o) => o.id === modelOptionId);

  const modelOptionGroups = React.useMemo(() => {
    const groups = new Map<string, AgentModelOption[]>();
    for (const option of modelOptions) {
      const key = option.groupLabel;
      const list = groups.get(key) ?? [];
      list.push(option);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [modelOptions]);

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
          {slashEntries
            .filter((c) => c.slash.startsWith(slashQuery))
            .map((item) => (
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
            <AgentWorkspaceSelect
              mode={mode}
              workspaceId={workspaceId}
              workspaceChoices={workspaceChoices}
              onWorkspaceIdChange={onWorkspaceIdChange}
              locked={workspaceLocked}
              disabled={disabled}
            />
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            {thinkingSeconds !== undefined && disabled ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Pensando… {thinkingSeconds}s
              </span>
            ) : null}
            <AgentModeSelect
              mode={mode}
              onModeChange={onModeChange}
              disabled={disabled}
            />
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
                {modelOptionGroups.map(([groupLabel, items]) => (
                  <SelectGroup key={groupLabel}>
                    <SelectLabel>{groupLabel}</SelectLabel>
                    {items.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
