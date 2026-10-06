"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import type { AgentPlanQuestionsPart } from "@/backend/lib/agent/types";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { cn } from "@/frontend/lib/utils";

type AgentPlanQuestionsCardProps = {
  part: AgentPlanQuestionsPart;
  onSubmit: (answers: Record<string, string>) => void;
  submitting?: boolean;
};

export function AgentPlanQuestionsCard({
  part,
  onSubmit,
  submitting = false,
}: AgentPlanQuestionsCardProps) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  const allAnswered = part.questions.every((q) =>
    Boolean(answers[q.id]?.trim()),
  );

  return (
    <div className="w-full rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      {part.intro ? (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {part.intro}
        </p>
      ) : null}
      <div className="flex flex-col gap-5">
        {part.questions.map((question) => (
          <div key={question.id} className="flex flex-col gap-2.5">
            <Label className="text-sm font-medium leading-snug text-foreground">
              {question.prompt}
            </Label>
            {question.suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {question.suggestions.map((suggestion) => {
                  const selected = answers[question.id] === suggestion;
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={submitting || part.answered}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-left text-xs transition-colors sm:text-sm",
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: suggestion,
                        }))
                      }
                    >
                      {suggestion}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <Input
              value={answers[question.id] ?? ""}
              onChange={(event) =>
                setAnswers((prev) => ({
                  ...prev,
                  [question.id]: event.target.value,
                }))
              }
              placeholder="Outra resposta…"
              disabled={submitting || part.answered}
              className="h-10 text-sm"
            />
          </div>
        ))}
      </div>
      {!part.answered ? (
        <div className="mt-5 flex w-full justify-stretch sm:justify-end">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!allAnswered || submitting}
            onClick={() => onSubmit(answers)}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitting ? "Enviando…" : "Enviar respostas"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
