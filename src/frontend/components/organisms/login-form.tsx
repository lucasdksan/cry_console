"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/frontend/components/atoms/form-field";
import { PasswordInput } from "@/frontend/components/atoms/password-input";
import { AuthDivider } from "@/frontend/components/molecules/auth-divider";
import { GoogleSignInButton } from "@/frontend/components/molecules/google-sign-in-button";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { loginUser, type AuthActionState } from "@/backend/controllers/auth.controller";

type LoginFormProps = {
  redirectTo?: string;
  errorMessage?: string | null;
};

export function LoginForm({ redirectTo, errorMessage }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    loginUser,
    {},
  );

  const bannerError = errorMessage ?? state.error;

  return (
    <div className="flex flex-col gap-6">
      <GoogleSignInButton redirectTo={redirectTo} />
      <AuthDivider />
      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="to" value={redirectTo ?? "/dashboard"} />
        {bannerError ? (
          <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {bannerError}
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
            placeholder="Seu e-mail"
            className="h-12 rounded-[var(--radius-md)] border-border bg-background"
            required
          />
        </FormField>
        <div className="flex flex-col gap-2">
          <FormField
            id="password"
            label="Senha"
            error={state.fieldErrors?.password?.[0]}
          >
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              className="rounded-[var(--radius-md)] border-border bg-background"
              required
            />
          </FormField>
          <div className="flex justify-end">
            <Link
              href="/esqueci-senha"
              className="text-sm font-medium text-link hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-[var(--radius-md)] text-base font-semibold"
        >
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
