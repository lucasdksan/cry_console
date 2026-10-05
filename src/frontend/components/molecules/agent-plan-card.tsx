"use client";

import type { AgentPlanPendingPart } from "@/backend/lib/agent/types";
import { AgentMarkdown } from "@/frontend/components/molecules/agent-markdown";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

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
    <Card className="border-primary/30 bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Plano proposto</CardTitle>
      </CardHeader>
      <CardContent>
        <AgentMarkdown content={part.markdown} />
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" size="sm" onClick={onApprove} disabled={approving}>
          Aceitar e gerar
        </Button>
      </CardFooter>
    </Card>
  );
}
