"use client";

import { Bot, ListChecks, MessageCircleQuestion, type LucideIcon } from "lucide-react";

import type { AgentChatMode } from "@/generated/prisma/client";
import { AGENT_MODE_META } from "@/backend/lib/agent/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/frontend/components/ui/select";
import { cn } from "@/frontend/lib/utils";

const MODE_ICONS: Record<AgentChatMode, LucideIcon> = {
  agent: Bot,
  plan: ListChecks,
  ask: MessageCircleQuestion,
};

const MODE_ORDER = Object.keys(AGENT_MODE_META) as AgentChatMode[];

type AgentModeSelectProps = {
  mode: AgentChatMode;
  onModeChange: (mode: AgentChatMode) => void;
  disabled?: boolean;
};

export function AgentModeSelect({
  mode,
  onModeChange,
  disabled = false,
}: AgentModeSelectProps) {
  const current = AGENT_MODE_META[mode] ? mode : "agent";
  const CurrentIcon = MODE_ICONS[current];

  return (
    <Select
      value={current}
      onValueChange={(value) => onModeChange(value as AgentChatMode)}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Modo: ${AGENT_MODE_META[current].label}`}
        className="h-8 w-fit gap-1.5 rounded-full border-0 bg-transparent px-2.5 text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground data-popup-open:bg-muted/60 data-popup-open:text-foreground dark:bg-transparent"
      >
        <CurrentIcon className="size-3.5 shrink-0" />
        <span className="text-sm font-medium">
          {AGENT_MODE_META[current].label}
        </span>
      </SelectTrigger>
      <SelectContent
        side="top"
        align="end"
        sideOffset={8}
        alignItemWithTrigger={false}
        className="w-72 p-1"
      >
        <SelectGroup className="p-0">
          <SelectLabel className="px-2 pt-1.5 pb-1">Modo do agente</SelectLabel>
          {MODE_ORDER.map((key) => {
            const Icon = MODE_ICONS[key];
            const meta = AGENT_MODE_META[key];
            const selected = key === current;
            return (
              <SelectItem key={key} value={key} className="items-start py-2 pl-2">
                <span className="flex min-w-0 items-start gap-2.5 whitespace-normal">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
                      selected && "bg-primary/15 text-primary",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium leading-tight">
                      {meta.label}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {meta.description}
                    </span>
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
