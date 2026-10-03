"use client";

import type { SecretField } from "@/backend/lib/credentials-crypto";
import { FormField } from "@/frontend/components/atoms/form-field";
import { PasswordInput } from "@/frontend/components/atoms/password-input";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";

type WorkspaceSecretFieldProps = {
  field: SecretField;
  label: string;
  name: string;
  configured: boolean;
  placeholder?: string;
  error?: string;
};

export function WorkspaceSecretField({
  field,
  label,
  name,
  configured,
  placeholder,
  error,
}: WorkspaceSecretFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {configured ? (
          <Badge variant="secondary">Configurado</Badge>
        ) : (
          <Badge variant="outline">Não configurado</Badge>
        )}
      </div>
      <FormField id={name} label={configured ? "Substituir valor" : "Valor"} error={error}>
        <PasswordInput
          id={name}
          name={name}
          autoComplete="off"
          placeholder={
            placeholder ??
            (configured ? "Deixe em branco para manter o atual" : "Informe o valor")
          }
          className="rounded-[var(--radius-md)] border-border bg-background"
        />
      </FormField>
      {configured ? (
        <Button
          type="submit"
          form="workspace-remove-bridge"
          name="field"
          value={field}
          variant="outline"
          size="sm"
          className="w-fit"
        >
          Remover credencial
        </Button>
      ) : null}
    </div>
  );
}
