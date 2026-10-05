"use client";

import type { ReactNode } from "react";

import type { AgentMessagePublic } from "@/backend/lib/agent/types";
import { AgentActionPlanBlock } from "@/frontend/components/molecules/agent-action-plan-block";
import { AgentChartBlock } from "@/frontend/components/molecules/agent-chart-block";
import { AgentFunnelBlock } from "@/frontend/components/molecules/agent-funnel-block";
import { AgentMarkdown } from "@/frontend/components/molecules/agent-markdown";
import { AgentPlanCard } from "@/frontend/components/molecules/agent-plan-card";
import { AgentProjectionBlock } from "@/frontend/components/molecules/agent-projection-block";
import { Badge } from "@/frontend/components/ui/badge";
import { splitUserMessageAttachments } from "@/frontend/lib/agent/attachments";
import { cn } from "@/frontend/lib/utils";

type AgentMessageBubbleProps = {
  message: AgentMessagePublic;
  onApprovePlan?: (messageId: string) => void;
  approvingPlanId?: string | null;
};

export function AgentMessageBubble({
  message,
  onApprovePlan,
  approvingPlanId,
}: AgentMessageBubbleProps) {
  const isUser = message.role === "user";
  const planPart = message.parts.find((p) => p.type === "plan_pending");
  const { body, attachmentNames } = isUser
    ? splitUserMessageAttachments(message.content)
    : { body: message.content, attachmentNames: [] };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-muted text-foreground"
            : "bg-transparent text-foreground",
        )}
      >
        {attachmentNames.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {attachmentNames.map((name) => (
              <Badge key={name} variant="outline" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        ) : null}
        {isUser ? (
          <p className="whitespace-pre-wrap">{body || message.content}</p>
        ) : (
          <AgentMarkdown content={body} />
        )}
      </div>
      {!isUser &&
        message.parts.map((part, index) => {
          if (part.type === "plan_pending") {
            return null;
          }
          const key = `${part.type}-${index}`;
          const wrap = (node: ReactNode) => (
            <div key={key} className="w-full max-w-xl">
              {node}
            </div>
          );
          switch (part.type) {
            case "chart":
              return wrap(<AgentChartBlock part={part} />);
            case "projection":
              return wrap(<AgentProjectionBlock part={part} />);
            case "funnel":
              return wrap(<AgentFunnelBlock part={part} />);
            case "action_plan":
              return wrap(<AgentActionPlanBlock part={part} />);
            default:
              return null;
          }
        })}
      {!isUser && planPart?.type === "plan_pending" && onApprovePlan ? (
        <div className="w-full max-w-xl">
          <AgentPlanCard
            part={planPart}
            onApprove={() => onApprovePlan(message.id)}
            approving={approvingPlanId === message.id}
          />
        </div>
      ) : null}
    </div>
  );
}
