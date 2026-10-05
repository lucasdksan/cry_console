import { Store } from "lucide-react";

import {
  defaultNavSections,
  type NavGroupItem,
  type NavLinkItem,
  type NavSectionItem,
} from "@/frontend/navigation/nav";
import { WORKSPACE_ACTION_CATALOG } from "@/frontend/navigation/workspace-actions";
export type WorkspaceNavSummary = {
  id: string;
  name: string;
};

export type AgentSessionNavSummary = {
  id: string;
  title: string;
  workspaceName: string | null;
};

export function buildPrivateNavSections(
  workspaces: WorkspaceNavSummary[],
  agentSessions: AgentSessionNavSummary[] = [],
): NavSectionItem[] {
  const workspaceGroup: NavGroupItem = {
    type: "group",
    id: "workspaces",
    label: "Workspaces",
    headerAction: {
      href: "/lojas/nova",
      ariaLabel: "Nova loja",
    },
    items: workspaces.map((workspace): NavLinkItem => {
      const children: NavLinkItem[] = WORKSPACE_ACTION_CATALOG.map((action) => ({
        type: "link",
        id: `workspace-${workspace.id}-${action.id}`,
        label: action.label,
        href: action.href(workspace.id),
        icon: action.icon,
      }));
      return {
        type: "link",
        id: `workspace-${workspace.id}`,
        label: workspace.name,
        href: `/lojas/${workspace.id}`,
        icon: Store,
        toggleOnly: true,
        children,
      };
    }),
  };

  const sections = defaultNavSections.map((section) => {
    if (section.type !== "group" || section.id !== "general") {
      return section;
    }
    return {
      ...section,
      items: section.items.map((item) => {
        if (item.type !== "link" || item.id !== "agent") {
          return item;
        }
        const children: NavLinkItem[] = agentSessions.map((session) => ({
          type: "link",
          id: `agent-session-${session.id}`,
          label: session.workspaceName
            ? `${session.title} · ${session.workspaceName}`
            : session.title,
          href: `/agente/${session.id}`,
        }));
        return { ...item, children };
      }),
    };
  });

  return [workspaceGroup, ...sections];
}
