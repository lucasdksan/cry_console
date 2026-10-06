"use client";

import { Loader2 } from "lucide-react";

import type { AgentPlanPendingPart } from "@/backend/lib/agent/types";
import { AgentMarkdown } from "@/frontend/components/molecules/agent-markdown";
import { Button } from "@/frontend/components/ui/button";

type AgentPlanCardProps = {
  part: AgentPlanPendingPart;
  onApprove: () => void;
  approving?: boolean;
};

export function AgentPlanCard({
  part,
  onApprove,
  approving = false,
}: AgentPlanCardProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <AgentMarkdown content={part.markdown} />
      <div className="flex justify-end">
        <Button type="button" onClick={onApprove} disabled={approving}>
          {approving ? <Loader2 className="size-4 animate-spin" /> : null}
          {approving ? "Gerando…" : "Aceitar e gerar"}
        </Button>
      </div>
    </div>
  );
}
