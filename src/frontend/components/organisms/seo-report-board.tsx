"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";

import {
  getWorkspacePageAuditSet,
  runWorkspacePageAuditSet,
} from "@/backend/controllers/page-audit.controller";
import type { WorkspacePageAuditSetDTO } from "@/backend/lib/page-audit/types";
import { FormField } from "@/frontend/components/atoms/form-field";
import { PageAuditRoleReportPanel } from "@/frontend/components/molecules/page-audit-role-report";
import { PageAuditSetSummary } from "@/frontend/components/molecules/page-audit-set-summary";
import { SeoChecklistPanel } from "@/frontend/components/molecules/seo-checklist-panel";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";

type SeoReportBoardProps = {
  workspaceId: string;
  siteUrl: string;
  initial: WorkspacePageAuditSetDTO;
};

export function SeoReportBoard({ workspaceId, siteUrl, initial }: SeoReportBoardProps) {
  const [data, setData] = useState(initial);
  const [homePath, setHomePath] = useState("");
  const [categoryPath, setCategoryPath] = useState("");
  const [productPath, setProductPath] = useState("");
  const [searchPath, setSearchPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const measuredCount = useMemo(
    () => data.roles.filter((r) => r.report != null).length,
    [data.roles],
  );

  const tabValues = useMemo(() => data.roles.map((r) => r.role), [data.roles]);

  const [activeTab, setActiveTab] = useState(() => {
    const firstMeasured = initial.roles.find((r) => r.report)?.role;
    return firstMeasured ?? "home";
  });

  const resolvedTab = tabValues.includes(activeTab)
    ? activeTab
    : (tabValues[0] ?? "home");

  const refresh = useCallback(async () => {
    const loaded = await getWorkspacePageAuditSet(workspaceId);
    if (loaded.ok) {
      setData(loaded.data);
    }
  }, [workspaceId]);

  const run = useCallback(
    (force: boolean) => {
      startTransition(async () => {
        setError(null);
        const result = await runWorkspacePageAuditSet(workspaceId, {
          force,
          paths: {
            home: homePath.trim() || undefined,
            category: categoryPath.trim() || undefined,
            product: productPath.trim() || undefined,
            search: searchPath.trim() || undefined,
          },
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setData(result.data);
      });
    },
    [categoryPath, homePath, productPath, searchPath, workspaceId],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URLs do conjunto</CardTitle>
          <CardDescription>
            Home usa {siteUrl} por padrão. Informe caminhos opcionais para categoria, produto e busca.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField id="seo-home-path" label="Home (opcional)">
              <Input
                id="seo-home-path"
                placeholder="/"
                value={homePath}
                onChange={(e) => setHomePath(e.target.value)}
                disabled={pending}
              />
            </FormField>
            <FormField id="seo-category-path" label="Categoria">
              <Input
                id="seo-category-path"
                placeholder="/categoria"
                value={categoryPath}
                onChange={(e) => setCategoryPath(e.target.value)}
                disabled={pending}
              />
            </FormField>
            <FormField id="seo-product-path" label="Produto">
              <Input
                id="seo-product-path"
                placeholder="/p/sku"
                value={productPath}
                onChange={(e) => setProductPath(e.target.value)}
                disabled={pending}
              />
            </FormField>
            <FormField id="seo-search-path" label="Busca">
              <Input
                id="seo-search-path"
                placeholder="/s?q=termo"
                value={searchPath}
                onChange={(e) => setSearchPath(e.target.value)}
                disabled={pending}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => run(false)}>
              {pending ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
              Gerar conjunto SEO
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(true)}>
              Atualizar agora
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => void refresh()}>
              Recarregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <PageAuditSetSummary summary={data.summary} measuredCount={measuredCount} />

      <Tabs value={resolvedTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto w-full flex-wrap gap-1">
          {data.roles.map((role) => (
            <TabsTrigger key={role.role} value={role.role}>
              {role.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {data.roles.map((role) => (
          <TabsContent key={role.role} value={role.role} className="pt-4">
            <PageAuditRoleReportPanel roleReport={role} variant="seo" />
          </TabsContent>
        ))}
      </Tabs>

      <SeoChecklistPanel
        workspaceId={workspaceId}
        items={data.checklist}
        onUpdated={() => void refresh()}
      />
    </div>
  );
}
