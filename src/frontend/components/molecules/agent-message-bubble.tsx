"use client";

import type { ReactNode } from "react";

import type { AgentMessagePublic } from "@/backend/lib/agent/types";
import { AgentActionPlanBlock } from "@/frontend/components/molecules/agent-action-plan-block";
import { AgentChartBlock } from "@/frontend/components/molecules/agent-chart-block";
import { AgentFunnelBlock } from "@/frontend/components/molecules/agent-funnel-block";
import { AgentMarkdown } from "@/frontend/components/molecules/agent-markdown";
import { AgentPlanCard } from "@/frontend/components/molecules/agent-plan-card";
import { AgentPlanQuestionsCard } from "@/frontend/components/molecules/agent-plan-questions-card";
import { AgentProjectionBlock } from "@/frontend/components/molecules/agent-projection-block";
import { AgentWorkflowBlock } from "@/frontend/components/molecules/agent-workflow-block";
import { Badge } from "@/frontend/components/ui/badge";
import { splitUserMessageAttachments } from "@/frontend/lib/agent/attachments";
import { cn } from "@/frontend/lib/utils";

type AgentMessageBubbleProps = {
  message: AgentMessagePublic;
  onApprovePlan?: (messageId: string) => void;
  approvingPlanId?: string | null;
  onSubmitPlanAnswers?: (answers: Record<string, string>) => void;
  submittingPlanAnswers?: boolean;
  activePlanQuestionsMessageId?: string | null;
};

export function AgentMessageBubble({
  message,
  onApprovePlan,
  approvingPlanId,
  onSubmitPlanAnswers,
  submittingPlanAnswers = false,
  activePlanQuestionsMessageId = null,
}: AgentMessageBubbleProps) {
  const isUser = message.role === "user";
  const planPart = message.parts.find((p) => p.type === "plan_pending");
  const planQuestionsPart = message.parts.find(
    (p) => p.type === "plan_questions",
  );
  const { body, attachmentNames } = isUser
    ? splitUserMessageAttachments(message.content)
    : { body: message.content, attachmentNames: [] };
  const bodyText = body || (isUser ? message.content : "");
  const planAccepted =
    planPart?.type === "plan_pending" && Boolean(planPart.accepted);
  const showPlan =
    !isUser &&
    planPart?.type === "plan_pending" &&
    !planAccepted &&
    Boolean(onApprovePlan);
  const planRepeatsBody =
    showPlan &&
    planPart.markdown.trim() === (bodyText || message.content).trim();
  const showPlanQuestionsBox =
    !isUser &&
    planQuestionsPart?.type === "plan_questions" &&
    !planQuestionsPart.answered &&
    activePlanQuestionsMessageId === message.id &&
    Boolean(onSubmitPlanAnswers);
  const planQuestionsAnswered =
    planQuestionsPart?.type === "plan_questions" &&
    Boolean(planQuestionsPart.answered);
  const hideAssistantBodyForQuestions =
    planQuestionsPart?.type === "plan_questions" &&
    (showPlanQuestionsBox || planQuestionsAnswered);

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-4",
          isUser ? "max-w-[min(85%,32rem)]" : "w-full",
        )}
      >
        {isUser ? (
          <div className="rounded-[1.25rem] bg-secondary px-4 py-2.5 text-[15px] leading-7 text-foreground">
            {attachmentNames.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1">
                {attachmentNames.map((name) => (
                  <Badge key={name} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : null}
            {bodyText ? (
              <p className="whitespace-pre-wrap">{bodyText}</p>
            ) : null}
          </div>
        ) : planQuestionsAnswered &&
          planQuestionsPart?.type === "plan_questions" &&
          planQuestionsPart.intro ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {planQuestionsPart.intro}
          </p>
        ) : bodyText &&
          (!planRepeatsBody || planAccepted) &&
          !hideAssistantBodyForQuestions ? (
          <AgentMarkdown content={bodyText} />
        ) : null}
        {!isUser &&
          message.parts.map((part, index) => {
            if (part.type === "plan_pending" || part.type === "plan_questions") {
              return null;
            }
            const key = `${part.type}-${index}`;
            const wrap = (node: ReactNode) => (
              <div key={key} className="w-full">
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
              case "workflow":
                return wrap(<AgentWorkflowBlock part={part} />);
              default:
                return null;
            }
          })}
        {showPlanQuestionsBox &&
        planQuestionsPart?.type === "plan_questions" &&
        onSubmitPlanAnswers ? (
          <AgentPlanQuestionsCard
            part={planQuestionsPart}
            onSubmit={onSubmitPlanAnswers}
            submitting={submittingPlanAnswers}
          />
        ) : null}
        {showPlan && planPart?.type === "plan_pending" && onApprovePlan ? (
          <AgentPlanCard
            part={planPart}
            onApprove={() => onApprovePlan(message.id)}
            approving={approvingPlanId === message.id}
          />
        ) : null}
      </div>
    </div>
  );
}
