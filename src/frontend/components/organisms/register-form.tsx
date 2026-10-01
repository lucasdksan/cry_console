"use client";

import { useActionState } from "react";

import { FormField } from "@/frontend/components/atoms/form-field";
import { PasswordInput } from "@/frontend/components/atoms/password-input";
import { AuthDivider } from "@/frontend/components/molecules/auth-divider";
import { GoogleSignInButton } from "@/frontend/components/molecules/google-sign-in-button";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { registerUser, type AuthActionState } from "@/backend/controllers/auth.controller";

type RegisterFormProps = {
  redirectTo?: string;
};

export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    registerUser,
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      <GoogleSignInButton redirectTo={redirectTo} />
      <AuthDivider />
      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="to" value={redirectTo ?? "/dashboard"} />
        {state.error ? (
          <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <FormField
          id="name"
          label="Nome completo"
          error={state.fieldErrors?.name?.[0]}
        >
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Seu nome completo"
            className="h-12 rounded-[var(--radius-md)] border-border bg-background"
            required
          />
        </FormField>
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
            placeholder="Seu e-mail"
            className="h-12 rounded-[var(--radius-md)] border-border bg-background"
            required
          />
        </FormField>
        <FormField
          id="password"
          label="Senha"
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
          label="Confirme sua senha"
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
          {pending ? "Cadastrando..." : "Cadastrar-se gratuitamente"}
        </Button>
      </form>
    </div>
  );
}
