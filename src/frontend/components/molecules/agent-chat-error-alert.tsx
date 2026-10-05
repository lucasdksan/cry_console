"use client";

import { AlertCircle, X } from "lucide-react";

import { Button } from "@/frontend/components/ui/button";

export type AgentChatErrorState = {
  message: string;
  retryable: boolean;
};

type AgentChatErrorAlertProps = {
  error: AgentChatErrorState;
  onDismiss: () => void;
};

export function AgentChatErrorAlert({
  error,
  onDismiss,
}: AgentChatErrorAlertProps) {
  return (
    <div
      role="alert"
      className="relative rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <div className="flex gap-2 pr-8">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium">
            {error.retryable
              ? "Modelo indisponível no momento"
              : "Não foi possível gerar a resposta"}
          </p>
          <p className="text-destructive/90">{error.message}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 size-8 text-destructive hover:bg-destructive/10"
        onClick={onDismiss}
        aria-label="Fechar aviso"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
