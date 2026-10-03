"use client";

import { useActionState, useEffect, useMemo } from "react";

import {
  saveUserAiProvider,
  type AccountSettingsActionState,
} from "@/backend/controllers/account-settings.controller";
import { AI_PROVIDER_CATALOG } from "@/backend/lib/ai-provider-catalog";
import type { UserAiProvidersPublic } from "@/backend/models/user-ai-provider.model";
import { AccountSettingsProviderCard } from "@/frontend/components/molecules/account-settings-provider-card";
import { NativeSelect } from "@/frontend/components/atoms/native-select";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type AccountSettingsProvidersSectionProps = {
  data: UserAiProvidersPublic;
  onProvidersChange?: (data: UserAiProvidersPublic) => void;
};

export function AccountSettingsProvidersSection({
  data,
  onProvidersChange,
}: AccountSettingsProvidersSectionProps) {
  const [addState, addAction, adding] = useActionState<
    AccountSettingsActionState,
    FormData
  >(saveUserAiProvider, {});

  const effectiveData = useMemo(
    () => addState.providers ?? data,
    [addState.providers, data],
  );

  useEffect(() => {
    if (addState.providers) {
      onProvidersChange?.(addState.providers);
    }
  }, [addState.providers, onProvidersChange]);

  return (
    <div className="flex flex-col gap-4">
      {effectiveData.providers.length === 0 ? (
        <Card className="border-dashed border-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Nenhum provedor
            </CardTitle>
            <CardDescription>
              Adicione um provedor abaixo e informe o token de acesso da API.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        effectiveData.providers.map((provider) => (
          <AccountSettingsProviderCard
            key={provider.providerKey}
            provider={provider}
            onProvidersChange={onProvidersChange}
          />
        ))
      )}

      {effectiveData.availableToAdd.length > 0 ? (
        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Adicionar provedor
            </CardTitle>
            <CardDescription>
              Cada provedor guarda seu próprio token, cifrado no servidor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {addState.error ? (
              <p className="mb-3 text-sm text-destructive">{addState.error}</p>
            ) : null}
            {addState.success ? (
              <p className="mb-3 text-sm text-muted-foreground">
                {addState.success}
              </p>
            ) : null}
            <form action={addAction} className="flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="hasApiToken" value="0" />
              <NativeSelect
                name="providerKey"
                required
                className="min-w-0 flex-1 cursor-pointer rounded-[var(--radius-md)] border-border bg-background"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione o provedor
                </option>
                {effectiveData.availableToAdd.map((item) => (
                  <option key={item.providerKey} value={item.providerKey}>
                    {item.label} —{" "}
                    {AI_PROVIDER_CATALOG[item.providerKey].description}
                  </option>
                ))}
              </NativeSelect>
              <Button
                type="submit"
                disabled={adding}
                className="cursor-pointer sm:shrink-0"
              >
                {adding ? "Adicionando…" : "Adicionar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
