"use client";

import { useActionState } from "react";

import { FormField } from "@/frontend/components/atoms/form-field";
import { PasswordInput } from "@/frontend/components/atoms/password-input";
import { Button } from "@/frontend/components/ui/button";
import { resetPassword, type AuthActionState } from "@/backend/controllers/auth.controller";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    resetPassword,
    {},
  );

  if (!token) {
    return (
      <p className="text-center text-sm text-destructive">
        Link inválido. Solicite uma nova redefinição de senha.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <FormField
        id="password"
        label="Nova senha"
        error={state.fieldErrors?.password?.[0]}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Deve ter no mínimo 8 caracteres"
          className="rounded-[var(--radius-md)] border-border bg-background"
          required
        />
      </FormField>
      <FormField
        id="confirmPassword"
        label="Confirme a nova senha"
        error={state.fieldErrors?.confirmPassword?.[0]}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Deve ter no mínimo 8 caracteres"
          className="rounded-[var(--radius-md)] border-border bg-background"
          required
        />
      </FormField>
      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-[var(--radius-md)] text-base font-semibold"
      >
        {pending ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
