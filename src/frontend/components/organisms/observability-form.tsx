"use client";

import { useActionState, useMemo, useState } from "react";

import {
  saveObservability,
  type ObservabilityActionState,
} from "@/backend/controllers/observability.controller";
import type { ObservabilityPublic } from "@/backend/models/observability.model";
import { FormField } from "@/frontend/components/atoms/form-field";
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

type PageTypeKey = "home" | "pdp" | "plp";

const PAGE_LABELS: Record<PageTypeKey, string> = {
  home: "Home",
  pdp: "PDP (produto)",
  plp: "PLP (listagem)",
};

type ObservabilityFormProps = {
  workspaceId: string;
  observability: ObservabilityPublic;
  sentryConfigured: boolean;
  scriptBaseUrl: string;
};

type PatternRow = {
  id: string;
  pageType: PageTypeKey;
  pathnameGlob: string;
};

function initialRows(observability: ObservabilityPublic): PatternRow[] {
  if (observability.patterns.length === 0) {
    return [
      { id: "home-0", pageType: "home", pathnameGlob: "/" },
      { id: "pdp-0", pageType: "pdp", pathnameGlob: "/p/*" },
      { id: "plp-0", pageType: "plp", pathnameGlob: "/*/p" },
    ];
  }
  return observability.patterns.map((p) => ({
    id: p.id,
    pageType: p.pageType,
    pathnameGlob: p.pathnameGlob,
  }));
}

export function ObservabilityForm({
  workspaceId,
  observability,
  sentryConfigured,
  scriptBaseUrl,
}: ObservabilityFormProps) {
  const [rows, setRows] = useState<PatternRow[]>(() =>
    initialRows(observability),
  );
  const [state, formAction, pending] = useActionState<
    ObservabilityActionState,
    FormData
  >(saveObservability, {});

  const patternsJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .map((r) => ({
            pageType: r.pageType,
            pathnameGlob: r.pathnameGlob.trim(),
          }))
          .filter((r) => r.pathnameGlob.length > 0),
      ),
    [rows],
  );

  const scriptSnippet =
    observability.publicKey && observability.hasSentryProject
      ? `<script src="${scriptBaseUrl}/api/observability/script/${observability.publicKey}" async></script>`
      : null;

  function addRow(pageType: PageTypeKey) {
    setRows((prev) => [
      ...prev,
      {
        id: `${pageType}-${Date.now()}`,
        pageType,
        pathnameGlob: "",
      },
    ]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateGlob(id: string, pathnameGlob: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, pathnameGlob } : r)),
    );
  }

  const grouped: Record<PageTypeKey, PatternRow[]> = {
    home: rows.filter((r) => r.pageType === "home"),
    pdp: rows.filter((r) => r.pageType === "pdp"),
    plp: rows.filter((r) => r.pageType === "plp"),
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="patternsJson" value={patternsJson} />

      {state.error ? (
        <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-[var(--radius-md)] border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
          {state.success}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Observabilidade</CardTitle>
            {observability.hasSentryProject ? (
              <Badge variant="secondary">Projeto ativo</Badge>
            ) : (
              <Badge variant="outline">Não provisionado</Badge>
            )}
          </div>
          <CardDescription>
            Cadastre globs de pathname para Home, PDP e PLP. Erros, Web Vitals e
            Session Replay (amostrado) só nessas páginas. Use{" "}
            <code className="text-xs">*</code> para um segmento e{" "}
            <code className="text-xs">**</code> para o restante do path.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!sentryConfigured ? (
            <p className="text-sm text-muted-foreground">
              O servidor ainda não está conectado ao Sentry. Você pode salvar
              padrões depois que{" "}
              <code className="text-xs">SENTRY_*</code> estiver configurado.
            </p>
          ) : null}

          {(Object.keys(PAGE_LABELS) as PageTypeKey[]).map((pageType) => (
            <div key={pageType} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <Label>{PAGE_LABELS[pageType]}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(pageType)}
                >
                  Adicionar padrão
                </Button>
              </div>
              {grouped[pageType].length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum padrão para {PAGE_LABELS[pageType].toLowerCase()}.
                </p>
              ) : (
                grouped[pageType].map((row) => (
                  <div key={row.id} className="flex gap-2">
                    <FormField
                      id={`glob-${row.id}`}
                      label="Pathname"
                      className="flex-1"
                    >
                      <Input
                        id={`glob-${row.id}`}
                        name={`glob-${row.id}`}
                        placeholder={
                          pageType === "home"
                            ? "/"
                            : pageType === "pdp"
                              ? "/p/*"
                              : "/*/p"
                        }
                        value={row.pathnameGlob}
                        onChange={(e) => updateGlob(row.id, e.target.value)}
                        autoComplete="off"
                      />
                    </FormField>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 self-end"
                      onClick={() => removeRow(row.id)}
                    >
                      Remover
                    </Button>
                  </div>
                ))
              )}
            </div>
          ))}

          {state.fieldErrors?.patterns ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.patterns[0]}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar observabilidade"}
          </Button>
        </CardFooter>
      </Card>

      {scriptSnippet ? (
        <Card>
          <CardHeader>
            <CardTitle>Script para a loja</CardTitle>
            <CardDescription>
              Cole antes do <code className="text-xs">&lt;/head&gt;</code> no
              site. A URL não muda ao editar padrões.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-muted/30 p-3 text-xs">
              {scriptSnippet}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}
