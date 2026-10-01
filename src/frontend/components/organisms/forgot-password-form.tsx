"use client";

import { useActionState } from "react";

import { FormField } from "@/frontend/components/atoms/form-field";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import {
  requestPasswordReset,
  type AuthActionState,
} from "@/backend/controllers/auth.controller";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.success ? (
        <p className="rounded-[var(--radius-md)] border border-brand-secondary/40 bg-brand-secondary/10 px-3 py-2 text-sm text-brand-secondary">
          {state.success}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <FormField
        id="email"
        label="E-mail"
        error={state.fieldErrors?.email?.[0]}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Digite o e-mail cadastrado"
          className="h-12 rounded-[var(--radius-md)] border-border bg-background"
          required
        />
      </FormField>
      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-[var(--radius-md)] text-base font-semibold"
      >
        {pending ? "Enviando..." : "Recuperar minha senha"}
      </Button>
    </form>
  );
}
