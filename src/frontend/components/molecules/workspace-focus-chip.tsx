"use client";

import type { OverviewDotState, OverviewSourceKey } from "@/backend/lib/overview-types";
import { configDotsForWorkspace } from "@/backend/lib/overview-status";
import type { OverviewDTO } from "@/backend/lib/overview-types";
import type { WorkspaceOverviewListItem } from "@/backend/models/workspace.model";
import { StatusDot } from "@/frontend/components/atoms/status-dot";
import { cn } from "@/frontend/lib/utils";

const SOURCE_LABELS: Record<OverviewSourceKey, string> = {
  vtex: "VTEX",
  analytics: "GA4",
  "search-console": "Search",
  clarity: "Clarity",
};

type WorkspaceFocusChipProps = {
  workspace: WorkspaceOverviewListItem;
  selected: boolean;
  overview: OverviewDTO | null;
  onSelect: () => void;
};

function dotsForChip(
  workspace: WorkspaceOverviewListItem,
  overview: OverviewDTO | null,
): Record<OverviewSourceKey, OverviewDotState> {
  if (overview?.workspaceId === workspace.id) {
    return {
      vtex: overview.sources.vtex.dot,
      analytics: overview.sources.analytics.dot,
      "search-console": overview.sources["search-console"].dot,
      clarity: overview.sources.clarity.dot,
    };
  }
  return configDotsForWorkspace(workspace);
}

export function WorkspaceFocusChip({
  workspace,
  selected,
  overview,
  onSelect,
}: WorkspaceFocusChipProps) {
  const dots = dotsForChip(workspace, overview);
  const sources: OverviewSourceKey[] = [
    "vtex",
    "analytics",
    "search-console",
    "clarity",
  ];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-w-[9.5rem] shrink-0 flex-col gap-2 rounded-[var(--radius-lg)] border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_var(--primary)]"
          : "border-border bg-card hover:border-muted-foreground/40",
      )}
    >
      <span className="truncate text-sm font-medium">{workspace.name}</span>
      <span className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <StatusDot
            key={source}
            state={dots[source]}
            label={`${SOURCE_LABELS[source]}: ${dots[source]}`}
          />
        ))}
      </span>
    </button>
  );
}
