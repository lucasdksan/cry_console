"use client";

import { useCallback, useState, useTransition } from "react";

import { updateSeoChecklistItem } from "@/backend/controllers/page-audit.controller";
import type { SeoChecklistItemDTO } from "@/backend/lib/page-audit/checklist";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/frontend/components/ui/toggle-group";

type SeoChecklistPanelProps = {
  workspaceId: string;
  items: SeoChecklistItemDTO[];
  onUpdated?: () => void;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "done", label: "Feito" },
  { value: "not_applicable", label: "N/A" },
] as const;

function statusBadgeVariant(
  status: SeoChecklistItemDTO["status"],
): "secondary" | "default" | "outline" {
  if (status === "done") return "default";
  if (status === "not_applicable") return "outline";
  return "secondary";
}

export function SeoChecklistPanel({ workspaceId, items, onUpdated }: SeoChecklistPanelProps) {
  const [localItems, setLocalItems] = useState(items);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = [...new Set(localItems.map((i) => i.group))];

  const setStatus = useCallback(
    (itemKey: string, status: SeoChecklistItemDTO["status"]) => {
      startTransition(async () => {
        setError(null);
        const result = await updateSeoChecklistItem(workspaceId, { itemKey, status });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setLocalItems((prev) =>
          prev.map((item) => (item.key === itemKey ? { ...item, status } : item)),
        );
        onUpdated?.();
      });
    },
    [onUpdated, workspaceId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Checklist FastStore (liveSEO)</CardTitle>
        <CardDescription>
          Itens que o crawl não valida — marque conforme implementação no projeto da loja.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {groups.map((group) => {
          const groupItems = localItems.filter((i) => i.group === group);
          const groupLabel = groupItems[0]?.groupLabel ?? group;
          return (
            <div key={group} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">{groupLabel}</h3>
              <ul className="flex flex-col gap-4">
                {groupItems.map((item) => (
                  <li
                    key={item.key}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{item.title}</span>
                        <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ToggleGroup
                      value={[item.status]}
                      onValueChange={(values) => {
                        const next = values[0];
                        if (!next || pending) return;
                        setStatus(item.key, next as SeoChecklistItemDTO["status"]);
                      }}
                      className="flex w-full flex-wrap gap-1 sm:w-auto"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <ToggleGroupItem
                          key={opt.value}
                          value={opt.value}
                          size="sm"
                          disabled={pending}
                        >
                          {opt.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
