import { Bell, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkspaceActionDefinition = {
  id: string;
  label: string;
  icon?: LucideIcon;
  href: (workspaceId: string) => string;
};

export const WORKSPACE_ACTION_CATALOG: WorkspaceActionDefinition[] = [
  {
    id: "config",
    label: "Configurações",
    icon: Settings,
    href: (workspaceId) => `/lojas/${workspaceId}`,
  },
  {
    id: "avisos",
    label: "Avisos",
    icon: Bell,
    href: (workspaceId) => `/lojas/${workspaceId}/avisos`,
  },
];
