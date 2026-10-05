"use client";

import type { OverviewDTO } from "@/backend/lib/overview/types";
import type { WorkspaceOverviewListItem } from "@/backend/models/workspace.model";
import { WorkspaceFocusChip } from "@/frontend/components/molecules/workspace-focus-chip";

type OverviewWorkspaceSwitcherProps = {
  workspaces: WorkspaceOverviewListItem[];
  focusId: string;
  overviewsById: Map<string, OverviewDTO>;
  onFocus: (workspaceId: string) => void;
};

export function OverviewWorkspaceSwitcher({
  workspaces,
  focusId,
  overviewsById,
  onFocus,
}: OverviewWorkspaceSwitcherProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {workspaces.map((workspace) => (
        <WorkspaceFocusChip
          key={workspace.id}
          workspace={workspace}
          selected={workspace.id === focusId}
          overview={overviewsById.get(workspace.id) ?? null}
          onSelect={() => onFocus(workspace.id)}
        />
      ))}
    </div>
  );
}
