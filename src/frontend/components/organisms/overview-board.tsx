"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { activateWorkspace } from "@/backend/controllers/workspace.controller";
import { getWorkspaceOverview } from "@/backend/controllers/overview.controller";
import type { OverviewDTO } from "@/backend/lib/overview-types";
import type { WorkspaceOverviewListItem } from "@/backend/models/workspace.model";
import { OverviewHero } from "@/frontend/components/organisms/overview-hero";
import { OverviewSources } from "@/frontend/components/organisms/overview-sources";
import { OverviewWorkspaceSwitcher } from "@/frontend/components/organisms/overview-workspace-switcher";
import { Button } from "@/frontend/components/ui/button";

type OverviewBoardProps = {
  workspaces: WorkspaceOverviewListItem[];
  initialFocusId: string;
};

export function OverviewBoard({
  workspaces,
  initialFocusId,
}: OverviewBoardProps) {
  const [focusId, setFocusId] = useState(initialFocusId);
  const [cache, setCache] = useState<Map<string, OverviewDTO>>(() => new Map());
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const focusedOverview = cache.get(focusId) ?? null;
  const loading = pending && !focusedOverview;

  const overviewsById = useMemo(() => cache, [cache]);

  const fetchOverview = useCallback((workspaceId: string, force: boolean) => {
    if (!force && cacheRef.current.has(workspaceId)) {
      return;
    }

    startTransition(async () => {
      setLoadError(null);
      const result = await getWorkspaceOverview(workspaceId);
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setCache((prev) => {
        const next = new Map(prev);
        next.set(workspaceId, result.data);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    fetchOverview(focusId, false);
  }, [focusId, fetchOverview]);

  const handleFocus = (workspaceId: string) => {
    if (workspaceId === focusId) {
      return;
    }
    setFocusId(workspaceId);
    startTransition(async () => {
      await activateWorkspace(workspaceId);
    });
  };

  const handleRefresh = () => {
    fetchOverview(focusId, true);
  };

  const periodLabel = focusedOverview?.periodLabel ?? "Últimos 30 dias";

  return (
    <div className="flex flex-col gap-6">
      <OverviewWorkspaceSwitcher
        workspaces={workspaces}
        focusId={focusId}
        overviewsById={overviewsById}
        onFocus={handleFocus}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={handleRefresh}
          className="rounded-[var(--radius-md)]"
        >
          Atualizar
        </Button>
      </div>

      {loadError ? (
        <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <OverviewHero kpis={focusedOverview?.hero ?? null} loading={loading} />
      <OverviewSources
        overview={focusedOverview}
        loading={loading}
        workspaceId={focusId}
      />
    </div>
  );
}
