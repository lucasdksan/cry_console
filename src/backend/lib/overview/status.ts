import type { WorkspaceOverviewListItem } from "@/backend/models/workspace.model";
import type {
  OverviewDotState,
  OverviewSourceKey,
  OverviewSourceState,
} from "@/backend/lib/overview/types";

export function isVtexConfigured(workspace: WorkspaceOverviewListItem): boolean {
  return Boolean(
    workspace.vtexAccountName?.trim() &&
      workspace.vtexEnvironment?.trim() &&
      workspace.hasVtexAppKey &&
      workspace.hasVtexAppToken,
  );
}

export function isGa4Configured(workspace: WorkspaceOverviewListItem): boolean {
  return Boolean(
    workspace.hasGaServiceAccount && workspace.gaPropertyId?.trim(),
  );
}

export function isGscConfigured(workspace: WorkspaceOverviewListItem): boolean {
  return Boolean(workspace.hasGaServiceAccount && workspace.siteUrl?.trim());
}

export function isClarityConfigured(
  workspace: WorkspaceOverviewListItem,
): boolean {
  return Boolean(workspace.hasClarityToken);
}

export function configDotsForWorkspace(
  workspace: WorkspaceOverviewListItem,
): Record<OverviewSourceKey, OverviewDotState> {
  return {
    vtex: isVtexConfigured(workspace) ? "untested" : "missing",
    analytics: isGa4Configured(workspace) ? "untested" : "missing",
    "search-console": isGscConfigured(workspace) ? "untested" : "missing",
    clarity: isClarityConfigured(workspace) ? "untested" : "missing",
  };
}

export function sourceStateFromCollect(
  configured: boolean,
  status: "ok" | "failed" | "skipped",
  error?: string,
): OverviewSourceState {
  if (!configured) {
    return { dot: "missing" };
  }
  if (status === "skipped") {
    return { dot: "untested" };
  }
  if (status === "ok") {
    return { dot: "ok" };
  }
  return { dot: "failed", error };
}
