"use client";

import { Sparkles } from "lucide-react";
import * as React from "react";

import type { AgentChatMode } from "@/generated/prisma/client";
import {
  AGENT_PRIMARY_CHIPS,
  AGENT_WORKSPACE_SLASH,
  slashSendText,
  type AgentSlashCatalogEntry,
} from "@/backend/lib/agent/command";
import { Button } from "@/frontend/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/frontend/components/ui/dialog";
import { cn } from "@/frontend/lib/utils";

type AgentContextBarProps = {
  mode: AgentChatMode;
  onModeChange: (mode: AgentChatMode) => void;
  workspaceId: string | null;
  onWorkspaceIdChange?: (id: string | null) => void;
  workspaceChoices: { id: string; name: string }[];
  workspaceLocked?: boolean;
  disabled?: boolean;
  onQuickCommand: (text: string) => void;
  className?: string;
};

export function AgentContextBar({
  disabled = false,
  onQuickCommand,
  className,
}: AgentContextBarProps) {
  const [commandsOpen, setCommandsOpen] = React.useState(false);

  const secondaryCommands = AGENT_WORKSPACE_SLASH.filter(
    (entry) => !entry.primaryChip && entry.chipLabel,
  );

  function runCommand(entry: AgentSlashCatalogEntry) {
    setCommandsOpen(false);
    onQuickCommand(slashSendText(entry));
  }

  return (
    <div
      className={cn(
        "flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {AGENT_PRIMARY_CHIPS.map((chip) =>
        chip.chipLabel ? (
          <Button
            key={chip.slash}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            className="h-8 shrink-0 rounded-full bg-primary/10 text-primary hover:bg-primary/15"
            onClick={() => runCommand(chip)}
          >
            {chip.chipLabel}
          </Button>
        ) : null,
      )}

      {secondaryCommands.length > 0 ? (
        <Dialog open={commandsOpen} onOpenChange={setCommandsOpen}>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                className="h-8 shrink-0 gap-1 rounded-full"
              />
            }
          >
            <Sparkles className="size-3.5" />
            Mais comandos
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Comandos da loja</DialogTitle>
            </DialogHeader>
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-sm">
              {secondaryCommands.map((item) => (
                <li key={item.slash}>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      runCommand(item);
                    }}
                  >
                    <span className="font-medium">{item.chipLabel}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.slash} — {item.hint}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
