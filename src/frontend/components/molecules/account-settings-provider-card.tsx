"use client";

import { useActionState, useEffect } from "react";

import {
  removeUserAiProvider,
  removeUserAiProviderToken,
  saveUserAiProvider,
  type AccountSettingsActionState,
} from "@/backend/controllers/account-settings.controller";
import { AI_PROVIDER_CATALOG } from "@/backend/lib/ai-provider-catalog";
import type {
  UserAiProviderPublic,
  UserAiProvidersPublic,
} from "@/backend/models/user-ai-provider.model";
import { FormField } from "@/frontend/components/atoms/form-field";
import { PasswordInput } from "@/frontend/components/atoms/password-input";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Separator } from "@/frontend/components/ui/separator";

type AccountSettingsProviderCardProps = {
  provider: UserAiProviderPublic;
  onProvidersChange?: (data: UserAiProvidersPublic) => void;
};

export function AccountSettingsProviderCard({
  provider,
  onProvidersChange,
}: AccountSettingsProviderCardProps) {
  const catalog = AI_PROVIDER_CATALOG[provider.providerKey];
  const formId = `provider-form-${provider.providerKey}`;

  const [state, formAction, pending] = useActionState<
    AccountSettingsActionState,
    FormData
  >(saveUserAiProvider, {});

  const [removeState, removeProviderAction, removingProvider] = useActionState<
    AccountSettingsActionState,
    FormData
  >(removeUserAiProvider, {});

  const [tokenState, removeTokenAction, removingToken] = useActionState<
    AccountSettingsActionState,
    FormData
  >(removeUserAiProviderToken, {});

  const bannerError =
    state.error ?? removeState.error ?? tokenState.error;
  const bannerSuccess =
    state.success ?? removeState.success ?? tokenState.success;
  const configured = provider.hasApiToken;
  const formKey = `${provider.defaultModel ?? ""}-${provider.baseUrl ?? ""}-${provider.isDefault ? "1" : "0"}-${configured ? "1" : "0"}`;

  useEffect(() => {
    const next =
      state.providers ?? removeState.providers ?? tokenState.providers;
    if (next) {
      onProvidersChange?.(next);
    }
  }, [
    onProvidersChange,
    removeState.providers,
    state.providers,
    tokenState.providers,
  ]);

  return (
    <Card className="border-border bg-card/80">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-heading text-base">{provider.label}</CardTitle>
          {provider.isDefault ? (
            <Badge variant="default">Padrão</Badge>
          ) : null}
          {configured ? (
            <Badge variant="secondary">Token configurado</Badge>
          ) : (
            <Badge variant="outline">Sem token</Badge>
          )}
        </div>
        <CardDescription>{catalog.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {bannerError ? (
          <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {bannerError}
          </p>
        ) : null}
        {bannerSuccess ? (
          <p className="rounded-[var(--radius-md)] border border-border bg-muted px-3 py-2 text-sm text-foreground">
            {bannerSuccess}
          </p>
        ) : null}

        <form
          key={formKey}
          id={formId}
          action={formAction}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="providerKey" value={provider.providerKey} />
          <input
            type="hidden"
            name="hasApiToken"
            value={configured ? "1" : "0"}
          />

          <FormField
            id={`${provider.providerKey}-defaultModel`}
            label="Modelo padrão"
            error={state.fieldErrors?.defaultModel?.[0]}
          >
            <Input
              id={`${provider.providerKey}-defaultModel`}
              name="defaultModel"
              list={`${provider.providerKey}-model-suggestions`}
              defaultValue={provider.defaultModel ?? ""}
              placeholder="Identificador do modelo"
              autoComplete="off"
              className="rounded-[var(--radius-md)] border-border bg-background"
            />
          </FormField>
          {catalog.modelSuggestions.length > 0 ? (
            <datalist id={`${provider.providerKey}-model-suggestions`}>
              {catalog.modelSuggestions.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          ) : null}

          {provider.providerKey === "custom" ? (
            <FormField
              id={`${provider.providerKey}-baseUrl`}
              label="URL base da API"
              error={state.fieldErrors?.baseUrl?.[0]}
            >
              <Input
                id={`${provider.providerKey}-baseUrl`}
                name="baseUrl"
                type="url"
                defaultValue={provider.baseUrl ?? ""}
                placeholder="https://gateway.exemplo/v1"
                autoComplete="off"
                className="rounded-[var(--radius-md)] border-border bg-background"
              />
            </FormField>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="isDefault"
              value="1"
              defaultChecked={provider.isDefault}
              className="size-4 rounded border-border accent-primary"
            />
            Usar como provedor padrão
          </label>

          <Separator />

          <FormField
            id={`${provider.providerKey}-apiToken`}
            label={configured ? "Substituir token de acesso" : "Token de acesso"}
            error={state.fieldErrors?.apiToken?.[0]}
          >
            <PasswordInput
              id={`${provider.providerKey}-apiToken`}
              name="apiToken"
              autoComplete="off"
              placeholder={
                configured
                  ? "Deixe em branco para manter o atual"
                  : "Cole a chave da API"
              }
              className="rounded-[var(--radius-md)] border-border bg-background"
            />
          </FormField>

          <Button
            type="submit"
            disabled={pending || removingProvider || removingToken}
            className="w-fit cursor-pointer"
          >
            {pending ? "Salvando…" : "Salvar provedor"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border pt-4">
        {configured ? (
          <form action={removeTokenAction}>
            <input
              type="hidden"
              name="providerKey"
              value={provider.providerKey}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={pending || removingProvider || removingToken}
              className="cursor-pointer"
            >
              {removingToken ? "Removendo…" : "Remover token"}
            </Button>
          </form>
        ) : null}
        <form action={removeProviderAction}>
          <input type="hidden" name="providerKey" value={provider.providerKey} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={pending || removingProvider || removingToken}
            className="cursor-pointer text-destructive hover:text-destructive"
          >
            {removingProvider ? "Removendo…" : "Excluir provedor"}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
