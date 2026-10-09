"use client";

import { FolderOpen, Store, Unplug, type LucideIcon } from "lucide-react";

import type { AgentChatMode } from "@/generated/prisma/client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/frontend/components/ui/select";
import { cn } from "@/frontend/lib/utils";

const NO_WORKSPACE = "none";

type WorkspaceChoice = { id: string; name: string };

type AgentWorkspaceSelectProps = {
  mode: AgentChatMode;
  workspaceId: string | null;
  workspaceChoices: WorkspaceChoice[];
  onWorkspaceIdChange?: (id: string | null) => void;
  locked?: boolean;
  disabled?: boolean;
};

function workspaceDisplayName(
  workspaceId: string | null,
  workspaceChoices: WorkspaceChoice[],
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

function WorkspaceOption({
  icon: Icon,
  label,
  hint,
  selected,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  selected: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5 whitespace-normal">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
          selected && "bg-primary/15 text-primary",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium leading-tight">
          {label}
        </span>
        {hint ? (
          <span className="text-xs leading-snug text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function AgentWorkspaceSelect({
  mode,
  workspaceId,
  workspaceChoices,
  onWorkspaceIdChange,
  locked = false,
  disabled = false,
}: AgentWorkspaceSelectProps) {
  const label = workspaceDisplayName(workspaceId, workspaceChoices, mode);

  if (locked || !onWorkspaceIdChange) {
    return (
      <span
        title={label}
        className="inline-flex h-8 max-w-[min(11rem,38vw)] items-center gap-1.5 rounded-full px-2.5 text-sm text-muted-foreground"
      >
        <FolderOpen className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  const value = workspaceId ?? NO_WORKSPACE;

  return (
    <Select
      value={value}
      onValueChange={(next) =>
        onWorkspaceIdChange(next === NO_WORKSPACE || !next ? null : next)
      }
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Loja: ${label}`}
        title={label}
        className="h-8 max-w-[min(11rem,38vw)] gap-1.5 rounded-full border-0 bg-transparent px-2.5 text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground data-popup-open:bg-muted/60 data-popup-open:text-foreground dark:bg-transparent"
      >
        <Store className="size-3.5 shrink-0" />
        <span className="truncate text-sm font-medium">{label}</span>
      </SelectTrigger>
      <SelectContent
        side="top"
        align="start"
        sideOffset={8}
        alignItemWithTrigger={false}
        className="w-64 p-1"
      >
        <SelectGroup className="p-0">
          <SelectLabel className="px-2 pt-1.5 pb-1">Loja da conversa</SelectLabel>
          {mode === "ask" ? (
            <SelectItem value={NO_WORKSPACE} className="py-2 pl-2">
              <WorkspaceOption
                icon={Unplug}
                label="Sem loja"
                hint="Só integrações e console."
                selected={value === NO_WORKSPACE}
              />
            </SelectItem>
          ) : null}
          {workspaceChoices.map((ws) => (
            <SelectItem key={ws.id} value={ws.id} className="py-2 pl-2">
              <WorkspaceOption
                icon={Store}
                label={ws.name}
                selected={value === ws.id}
              />
            </SelectItem>
          ))}
          {workspaceChoices.length === 0 && mode !== "ask" ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Nenhuma loja cadastrada.
            </p>
          ) : null}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
