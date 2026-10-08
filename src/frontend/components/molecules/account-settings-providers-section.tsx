"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import {
  saveUserAiProvider,
  type AccountSettingsActionState,
} from "@/backend/controllers/account-settings.controller";
import { AI_PROVIDER_CATALOG } from "@/backend/lib/ai/provider-catalog";
import type { UserAiProvidersPublic } from "@/backend/models/user-ai-provider.model";
import { AccountSettingsProviderCard } from "@/frontend/components/molecules/account-settings-provider-card";
import { Button } from "@/frontend/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select";
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

  const configuredProviderKeys = effectiveData.providers
    .map((provider) => provider.providerKey)
    .join(",");

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
            <AddProviderForm
              key={configuredProviderKeys}
              availableToAdd={effectiveData.availableToAdd}
              addAction={addAction}
              adding={adding}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

type AddProviderFormProps = {
  availableToAdd: UserAiProvidersPublic["availableToAdd"];
  addAction: (payload: FormData) => void;
  adding: boolean;
};

function AddProviderForm({
  availableToAdd,
  addAction,
  adding,
}: AddProviderFormProps) {
  const [providerKeyToAdd, setProviderKeyToAdd] = useState("");

  return (
    <form
      action={addAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="hasApiToken" value="0" />
      <input type="hidden" name="providerKey" value={providerKeyToAdd} />
      <div className="min-w-0 flex-1">
        <Select
          value={providerKeyToAdd || null}
          onValueChange={(value) => setProviderKeyToAdd(value ?? "")}
          disabled={adding}
        >
          <SelectTrigger className="h-8 w-full cursor-pointer rounded-[var(--radius-md)] border-border bg-background">
            <SelectValue placeholder="Selecione o provedor" />
          </SelectTrigger>
          <SelectContent className="max-w-[min(100vw-2rem,32rem)]">
            {availableToAdd.map((item) => (
              <SelectItem
                key={item.providerKey}
                value={item.providerKey}
                className="items-start py-2 whitespace-normal"
              >
                <span className="font-medium">{item.label}</span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  {AI_PROVIDER_CATALOG[item.providerKey].description}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        disabled={adding || !providerKeyToAdd}
        className="h-8 w-full cursor-pointer sm:w-auto sm:shrink-0"
      >
        {adding ? "Adicionando…" : "Adicionar"}
      </Button>
    </form>
  );
}
