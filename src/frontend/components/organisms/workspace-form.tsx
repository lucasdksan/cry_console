"use client";

import { useActionState } from "react";

import {
  createWorkspace,
  removeWorkspaceSecretAction,
  updateWorkspace,
  type WorkspaceActionState,
} from "@/backend/controllers/workspace.controller";
import { VTEX_ENVIRONMENTS } from "@/backend/lib/workspace/policy";
import type { WorkspacePublic } from "@/backend/models/workspace.model";
import { FormField } from "@/frontend/components/atoms/form-field";
import { NativeSelect } from "@/frontend/components/atoms/native-select";
import { PasswordInput } from "@/frontend/components/atoms/password-input";
import { WorkspaceSecretField } from "@/frontend/components/molecules/workspace-secret-field";
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
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";

type WorkspaceFormProps = {
  mode: "create" | "edit";
  workspace?: WorkspacePublic;
};

export function WorkspaceForm({ mode, workspace }: WorkspaceFormProps) {
  const action = mode === "create" ? createWorkspace : updateWorkspace;
  const [state, formAction, pending] = useActionState<
    WorkspaceActionState,
    FormData
  >(action, {});

  const bannerError = state.error;
  const bannerSuccess = state.success;

  return (
    <>
      <form id="workspace-form" action={formAction} className="flex flex-col gap-6">
        {mode === "edit" && workspace ? (
          <>
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <input
              type="hidden"
              name="hasVtexAppKey"
              value={workspace.hasVtexAppKey ? "1" : "0"}
            />
            <input
              type="hidden"
              name="hasVtexAppToken"
              value={workspace.hasVtexAppToken ? "1" : "0"}
            />
            <input
              type="hidden"
              name="hasClarityToken"
              value={workspace.hasClarityToken ? "1" : "0"}
            />
            <input
              type="hidden"
              name="hasGaServiceAccount"
              value={workspace.hasGaServiceAccount ? "1" : "0"}
            />
          </>
        ) : null}

        {bannerError ? (
          <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {bannerError}
          </p>
        ) : null}
        {bannerSuccess ? (
          <p className="rounded-[var(--radius-md)] border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {bannerSuccess}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Identidade da loja</CardTitle>
            <CardDescription>
              Nome e URL públicos deste workspace. O limite é de três lojas por
              conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              id="name"
              label="Nome da loja"
              error={state.fieldErrors?.name?.[0]}
            >
              <Input
                id="name"
                name="name"
                defaultValue={workspace?.name}
                placeholder="Ex.: damyller"
                className="h-11 rounded-[var(--radius-md)]"
                required
              />
            </FormField>
            <FormField
              id="siteUrl"
              label="URL do site"
              error={state.fieldErrors?.siteUrl?.[0]}
            >
              <Input
                id="siteUrl"
                name="siteUrl"
                type="url"
                defaultValue={workspace?.siteUrl}
                placeholder="https://www.sualoja.com.br"
                className="h-11 rounded-[var(--radius-md)]"
                required
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>VTEX</CardTitle>
            <CardDescription>
              Account name e environment ficam legíveis; App Key e App Token são
              cifrados e nunca reaparecem após salvar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              id="vtexAccountName"
              label="VTEX Account Name"
              error={state.fieldErrors?.vtexAccountName?.[0]}
            >
              <Input
                id="vtexAccountName"
                name="vtexAccountName"
                defaultValue={workspace?.vtexAccountName ?? ""}
                placeholder="accountname"
                className="h-11 rounded-[var(--radius-md)]"
              />
            </FormField>
            <FormField id="vtexEnvironment" label="VTEX Environment">
              <NativeSelect
                id="vtexEnvironment"
                name="vtexEnvironment"
                defaultValue={workspace?.vtexEnvironment ?? ""}
              >
                <option value="">Selecione…</option>
                {VTEX_ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            {mode === "edit" && workspace ? (
              <>
                <WorkspaceSecretField
                  field="vtexAppKey"
                  name="vtexAppKey"
                  label="VTEX App Key"
                  configured={workspace.hasVtexAppKey}
                  error={state.fieldErrors?.vtexAppKey?.[0]}
                />
                <WorkspaceSecretField
                  field="vtexAppToken"
                  name="vtexAppToken"
                  label="VTEX App Token"
                  configured={workspace.hasVtexAppToken}
                  error={state.fieldErrors?.vtexAppToken?.[0]}
                />
              </>
            ) : (
              <>
                <FormField id="vtexAppKey" label="VTEX App Key">
                  <PasswordInput
                    id="vtexAppKey"
                    name="vtexAppKey"
                    autoComplete="off"
                    className="rounded-[var(--radius-md)] border-border bg-background"
                  />
                </FormField>
                <FormField id="vtexAppToken" label="VTEX App Token">
                  <PasswordInput
                    id="vtexAppToken"
                    name="vtexAppToken"
                    autoComplete="off"
                    className="rounded-[var(--radius-md)] border-border bg-background"
                  />
                </FormField>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Microsoft Clarity</CardTitle>
            <CardDescription>Token armazenado de forma cifrada.</CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "edit" && workspace ? (
              <WorkspaceSecretField
                field="clarityToken"
                name="clarityToken"
                label="Clarity Token"
                configured={workspace.hasClarityToken}
                error={state.fieldErrors?.clarityToken?.[0]}
              />
            ) : (
              <FormField id="clarityToken" label="Clarity Token">
                <PasswordInput
                  id="clarityToken"
                  name="clarityToken"
                  autoComplete="off"
                  className="rounded-[var(--radius-md)] border-border bg-background"
                />
              </FormField>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Analytics (service account)</CardTitle>
            <CardDescription>
              Envie o JSON da service account. O arquivo não é salvo em disco.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {workspace?.hasGaServiceAccount && workspace.gaClientEmail ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Configurado</Badge>
                <span className="text-sm text-muted-foreground">
                  {workspace.gaClientEmail}
                </span>
              </div>
            ) : (
              <Badge variant="outline">Não configurado</Badge>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="gaServiceAccountFile">Arquivo JSON</Label>
              <Input
                id="gaServiceAccountFile"
                name="gaServiceAccountFile"
                type="file"
                accept="application/json,.json"
                className="h-auto min-h-11 rounded-[var(--radius-md)] py-2"
              />
            </div>
            <FormField
              id="gaPropertyId"
              label="GA4 Property ID"
              error={state.fieldErrors?.gaPropertyId?.[0]}
            >
              <Input
                id="gaPropertyId"
                name="gaPropertyId"
                inputMode="numeric"
                autoComplete="off"
                placeholder="123456789"
                defaultValue={workspace?.gaPropertyId ?? ""}
                className="rounded-[var(--radius-md)] border-border bg-background"
              />
            </FormField>
            <FormField
              id="gaServiceAccountJson"
              label="Ou cole o JSON"
              error={state.fieldErrors?.gaServiceAccount?.[0]}
            >
              <Textarea
                id="gaServiceAccountJson"
                name="gaServiceAccountJson"
                rows={4}
                placeholder='{"type":"service_account", ...}'
                className="rounded-[var(--radius-md)] font-mono text-xs"
              />
            </FormField>
            {mode === "edit" && workspace?.hasGaServiceAccount ? (
              <Button
                type="submit"
                form="workspace-remove-bridge"
                name="field"
                value="gaServiceAccount"
                variant="outline"
                size="sm"
                className="w-fit"
              >
                Remover JSON do GA
              </Button>
            ) : null}
          </CardContent>
          <CardFooter className="justify-end border-t border-border">
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-[var(--radius-md)] sm:w-auto sm:min-w-40"
            >
              {mode === "create" ? "Criar loja" : "Salvar alterações"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {mode === "edit" && workspace ? (
        <form
          id="workspace-remove-bridge"
          action={removeWorkspaceSecretAction}
        >
          <input type="hidden" name="workspaceId" value={workspace.id} />
        </form>
      ) : null}
    </>
  );
}
