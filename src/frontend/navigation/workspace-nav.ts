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

export function buildPrivateNavSections(
  workspaces: WorkspaceNavSummary[],
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

  return [workspaceGroup, ...defaultNavSections];
}
