import { Store } from "lucide-react";

import {
  defaultNavSections,
  type NavGroupItem,
  type NavSectionItem,
} from "@/frontend/navigation/nav";
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
    items: workspaces.map((workspace) => ({
      type: "link" as const,
      id: `workspace-${workspace.id}`,
      label: workspace.name,
      href: `/lojas/${workspace.id}`,
      icon: Store,
    })),
  };

  return [workspaceGroup, ...defaultNavSections];
}
