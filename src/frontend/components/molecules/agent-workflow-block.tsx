"use client";

import { ArrowDown } from "lucide-react";

import type { AgentWorkflowPart } from "@/backend/lib/agent/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type AgentWorkflowBlockProps = {
  part: AgentWorkflowPart;
};

function PhaseBlock({
  phase,
  showArrow,
}: {
  phase: NonNullable<AgentWorkflowPart["phases"]>[number];
  showArrow: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
        <p className="text-sm font-semibold leading-snug text-foreground">
          {phase.title}
        </p>
      </div>
      {phase.steps.length > 0 ? (
        <div className="flex w-full flex-col gap-2 border-l-2 border-border/80 pl-3">
          {phase.steps.map((step) => (
            <div
              key={step.id}
              className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-sm"
            >
              <p className="font-medium leading-snug text-foreground">
                {step.label}
              </p>
              {step.detail ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {showArrow ? (
        <ArrowDown
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

export function AgentWorkflowBlock({ part }: AgentWorkflowBlockProps) {
  const phases = part.phases ?? [];
  const legacyNodes = part.nodes ?? [];

  if (phases.length === 0 && legacyNodes.length === 0) {
    return null;
  }

  return (
    <Card className="w-full border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{part.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-stretch gap-2">
        {phases.length > 0
          ? phases.map((phase, index) => (
              <PhaseBlock
                key={phase.id}
                phase={phase}
                showArrow={index < phases.length - 1}
              />
            ))
          : legacyNodes.map((node, index) => (
              <div key={node.id} className="flex flex-col items-center gap-2">
                <div className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-sm">
                  <p className="font-medium leading-snug text-foreground">
                    {node.label}
                  </p>
                  {node.detail ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {node.detail}
                    </p>
                  ) : null}
                </div>
                {index < legacyNodes.length - 1 ? (
                  <ArrowDown
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                ) : null}
              </div>
            ))}
      </CardContent>
    </Card>
  );
}
