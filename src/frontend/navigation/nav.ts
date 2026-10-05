import {
  Bot,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export type NavLinkItem = {
  type: "link";
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  children?: NavLinkItem[];
  /** Só expande/recolhe filhos; navegação fica nas ações filhas. */
  toggleOnly?: boolean;
  trailingAction?: NavGroupHeaderAction;
};

export type NavExternalItem = {
  type: "external";
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
};

export type NavActionItem = {
  type: "action";
  id: "logout";
  label: string;
  icon?: LucideIcon;
};

export type NavSlotItem = {
  type: "slot";
  id: "session";
};

export type NavLeafItem =
  | NavLinkItem
  | NavExternalItem
  | NavActionItem
  | NavSlotItem;

export type NavGroupHeaderAction = {
  href: string;
  ariaLabel: string;
};

export type NavGroupItem = {
  type: "group";
  id: string;
  label: string;
  items: NavLeafItem[];
  headerAction?: NavGroupHeaderAction;
};

export type NavSectionItem = NavGroupItem | NavLeafItem;

export type NavFooterItem = NavActionItem | NavSlotItem;

export const defaultNavSections: NavSectionItem[] = [
  {
    type: "group",
    id: "general",
    label: "Geral",
    items: [
      {
        type: "link",
        id: "overview",
        label: "Visão geral",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        type: "link",
        id: "agent",
        label: "Agente",
        href: "/agente",
        icon: Bot,
        toggleOnly: true,
        trailingAction: {
          href: "/agente",
          ariaLabel: "Nova sessão",
        },
        children: [],
      },
    ],
  },
];

export const defaultNavFooter: NavFooterItem[] = [
  { type: "slot", id: "session" },
  {
    type: "action",
    id: "logout",
    label: "Sair",
    icon: LogOut,
  },
];

export { ExternalLink, LogOut };
