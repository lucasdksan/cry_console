import { BarChart3, Bell, MousePointerClick, Search, Settings } from "lucide-react";
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
  {
    id: "analise",
    label: "Análise",
    icon: BarChart3,
    href: (workspaceId) => `/lojas/${workspaceId}/analise`,
  },
  {
    id: "seo",
    label: "SEO",
    icon: Search,
    href: (workspaceId) => `/lojas/${workspaceId}/seo`,
  },
  {
    id: "cro",
    label: "CRO",
    icon: MousePointerClick,
    href: (workspaceId) => `/lojas/${workspaceId}/cro`,
  },
];
