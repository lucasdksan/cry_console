"use client";

import { ChevronDown, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";

import { deleteAgentSessionAction } from "@/backend/controllers/agent.controller";
import { logoutUser } from "@/backend/controllers/auth.controller";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/frontend/components/ui/alert-dialog";
import { BrandLogo } from "@/frontend/components/atoms/brand-logo";
import { NavSessionSlot } from "@/frontend/components/molecules/nav-session-slot";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/frontend/components/ui/input-group";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  sidebarMenuButtonVariants,
  useSidebar,
} from "@/frontend/components/ui/sidebar";
import { cn } from "@/frontend/lib/utils";
import {
  filterNavFooter,
  filterNavSections,
  navHasVisibleTargets,
} from "@/frontend/navigation/filter-nav";
import type {
  NavFooterItem,
  NavLeafItem,
  NavLinkItem,
  NavSectionItem,
} from "@/frontend/navigation/nav";
import { useAgentNavRefresh } from "@/frontend/lib/agent/nav-sync";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  sections: NavSectionItem[];
  footer: NavFooterItem[];
  slots?: Partial<Record<"session", React.ReactNode>>;
  onNavigate?: () => void;
  workspaceLimitReached?: boolean;
};

/** Coluna fixa à direita — alinha + do grupo com chevrons dos workspaces. */
const sidebarNavTrailingSlotClass =
  "flex size-7 shrink-0 items-center justify-center text-muted-foreground";

function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isToggleNavRouteActive(pathname: string, item: NavLinkItem): boolean {
  if (!item.children?.length) {
    return isNavItemActive(pathname, item.href);
  }
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }
  return item.children.some((child) => isNavItemActive(pathname, child.href));
}

export function AppSidebar({
  sections,
  footer,
  slots,
  onNavigate,
  workspaceLimitReached = false,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const refreshAgentNav = useAgentNavRefresh();
  const { isMobile, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");
  const [agentSessionPendingDelete, setAgentSessionPendingDelete] = useState<
    string | null
  >(null);
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState<
    Record<string, boolean>
  >({});

  const filteredSections = useMemo(
    () => filterNavSections(sections, query),
    [sections, query],
  );
  const filteredFooter = useMemo(
    () => filterNavFooter(footer, query),
    [footer, query],
  );
  const hasTargets = navHasVisibleTargets(filteredSections, filteredFooter);

  function closeMobileNav() {
    if (isMobile) {
      setOpenMobile(false);
    }
    onNavigate?.();
  }

  function renderLeaf(item: NavLeafItem) {
    if (item.type === "slot") {
      if (item.id === "session") {
        return slots?.session ?? <NavSessionSlot />;
      }
      return null;
    }

    if (item.type === "action") {
      if (item.id === "logout") {
        const Icon = item.icon;
        return (
          <SidebarMenuItem>
            <form action={logoutUser} className="w-full">
              <SidebarMenuButton type="submit" className="w-full">
                {Icon ? <Icon /> : null}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        );
      }
      return null;
    }

    if (item.type === "external") {
      const Icon = item.icon;
      return (
        <SidebarMenuItem>
          <SidebarMenuButton render={<a href={item.href} target="_blank" rel="noopener noreferrer" />}>
            {Icon ? <Icon /> : null}
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return renderNavLink(item);
  }

  function workspaceExpanded(link: NavLinkItem): boolean {
    if (!link.children?.length) {
      return false;
    }
    if (expandedWorkspaceIds[link.id] !== undefined) {
      return expandedWorkspaceIds[link.id];
    }
    return isToggleNavRouteActive(pathname, link);
  }

  function toggleWorkspace(link: NavLinkItem) {
    const next = !workspaceExpanded(link);
    setExpandedWorkspaceIds((prev) => ({ ...prev, [link.id]: next }));
  }

  async function confirmDeleteAgentSession() {
    if (!agentSessionPendingDelete) {
      return;
    }
    const sessionId = agentSessionPendingDelete;
    setAgentSessionPendingDelete(null);
    const result = await deleteAgentSessionAction(sessionId);
    if (result.ok) {
      if (pathname === `/agente/${sessionId}`) {
        router.push("/agente");
      }
      await refreshAgentNav();
      router.refresh();
      closeMobileNav();
    }
  }

  function renderNavLink(item: NavLinkItem) {
    const Icon = item.icon;
    const hasChildren = Boolean(item.children?.length);
    const isAgentNav = item.id === "agent";
    const toggleOnly = item.toggleOnly && hasChildren;
    const active = toggleOnly
      ? false
      : pathname === item.href ||
        (hasChildren ? false : isNavItemActive(pathname, item.href));
    const showChildren = hasChildren && workspaceExpanded(item);
    const showWorkspaceToggleChrome = toggleOnly && !isAgentNav;

    return (
      <SidebarMenuItem
        className={cn(hasChildren && "flex flex-col gap-1.5")}
      >
        {toggleOnly ? (
          <SidebarMenuButton
            type="button"
            onClick={(event) => {
              toggleWorkspace(item);
              event.currentTarget.blur();
            }}
            aria-expanded={showChildren}
            className={cn(
              "!grid w-full items-center gap-2 transition-none",
              showWorkspaceToggleChrome
                ? item.trailingAction
                  ? "grid-cols-[auto_minmax(0,1fr)_1.75rem_1.75rem]"
                  : "grid-cols-[auto_minmax(0,1fr)_1.75rem]"
                : "grid-cols-[auto_minmax(0,1fr)]",
              "focus-visible:ring-1 focus-visible:ring-sidebar-border/80",
              "data-active:bg-transparent data-active:font-normal data-active:shadow-none",
              showChildren &&
                "bg-sidebar-accent/50 font-medium text-sidebar-accent-foreground",
            )}
          >
            {Icon ? <Icon /> : null}
            <span className="truncate text-left">{item.label}</span>
            {showWorkspaceToggleChrome && item.trailingAction ? (
              <Link
                href={item.trailingAction.href}
                onClick={(event) => {
                  event.stopPropagation();
                  closeMobileNav();
                }}
                className={cn(
                  sidebarNavTrailingSlotClass,
                  "rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
                aria-label={item.trailingAction.ariaLabel}
              >
                <Plus className="size-4" />
              </Link>
            ) : null}
            {showWorkspaceToggleChrome ? (
              <span className={sidebarNavTrailingSlotClass} aria-hidden>
                {showChildren ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </span>
            ) : null}
          </SidebarMenuButton>
        ) : (
          <Link
            href={item.href}
            onClick={closeMobileNav}
            data-active={active ? "" : undefined}
            className={cn(sidebarMenuButtonVariants())}
          >
            {Icon ? <Icon /> : null}
            <span>{item.label}</span>
          </Link>
        )}
        {hasChildren ? (
          <SidebarMenuSub
            className={cn(
              "mx-3 gap-1.5 border-sidebar-border/60 py-0",
              !showChildren && "hidden",
            )}
            aria-hidden={!showChildren}
          >
            {item.children!.map((child) => {
              const childActive =
                pathname === child.href ||
                (child.href !== item.href &&
                  isNavItemActive(pathname, child.href));
              const ChildIcon = child.icon;
              if (child.id === "agent-new-session") {
                return (
                  <SidebarMenuSubItem key={child.id}>
                    <SidebarMenuSubButton
                      isActive={pathname === "/agente"}
                      className="text-muted-foreground"
                      render={
                        <Link href={child.href} onClick={closeMobileNav} />
                      }
                    >
                      {ChildIcon ? <ChildIcon /> : null}
                      <span>{child.label}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              }
              const agentSessionId = child.id.startsWith("agent-session-")
                ? child.id.slice("agent-session-".length)
                : null;
              if (agentSessionId) {
                return (
                  <SidebarMenuSubItem key={child.id}>
                    <div className="grid grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-0.5">
                      <SidebarMenuSubButton
                        isActive={childActive}
                        render={
                          <Link href={child.href} onClick={closeMobileNav} />
                        }
                      >
                        {ChildIcon ? <ChildIcon /> : null}
                        <span className="truncate">{child.label}</span>
                      </SidebarMenuSubButton>
                      <button
                        type="button"
                        className={cn(
                          sidebarNavTrailingSlotClass,
                          "rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive",
                        )}
                        aria-label={`Excluir ${child.label}`}
                        onClick={() =>
                          setAgentSessionPendingDelete(agentSessionId)
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </SidebarMenuSubItem>
                );
              }
              return (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton
                    isActive={childActive}
                    render={
                      <Link href={child.href} onClick={closeMobileNav} />
                    }
                  >
                    {ChildIcon ? <ChildIcon /> : null}
                    <span>{child.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        ) : null}
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar variant="floating" collapsible="offcanvas" className="p-3" {...props}>
      <SidebarHeader className="gap-1 p-3 pb-0">
        <BrandLogo className="justify-start" size="sm" />
      </SidebarHeader>

      <SidebarContent className="gap-3 p-3 pt-5">
        <div>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar no menu"
              aria-label="Buscar no menu"
            />
          </InputGroup>
        </div>

        {!hasTargets ? (
          <p className="px-4 text-sm text-muted-foreground">Nenhum item</p>
        ) : (
          filteredSections.map((section) => {
            if (section.type === "group") {
              return (
                <SidebarGroup key={section.id} className="py-0">
                  <SidebarGroupLabel
                    className={cn(
                      "w-full uppercase tracking-wide",
                      section.headerAction
                        ? "grid grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-0"
                        : undefined,
                    )}
                  >
                    <span className="truncate">{section.label}</span>
                    {section.headerAction && !workspaceLimitReached ? (
                      <Link
                        href={section.headerAction.href}
                        onClick={closeMobileNav}
                        className={cn(
                          sidebarNavTrailingSlotClass,
                          "rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                        aria-label={section.headerAction.ariaLabel}
                      >
                        <Plus className="size-4" />
                      </Link>
                    ) : section.headerAction && workspaceLimitReached ? (
                      <span className={sidebarNavTrailingSlotClass} aria-hidden />
                    ) : null}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu
                      className={
                        section.id === "workspaces" ? "gap-2" : undefined
                      }
                    >
                      {section.items.map((item) => (
                        <Fragment key={item.id}>{renderLeaf(item)}</Fragment>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            }

            return (
              <SidebarGroup key={section.id} className="py-0">
                <SidebarGroupContent>
                  <SidebarMenu>{renderLeaf(section)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })
        )}
      </SidebarContent>

      {filteredFooter.length > 0 ? (
        <SidebarFooter className="p-3">
          <SidebarSeparator />
          <SidebarMenu>
            {filteredFooter.map((item) => (
              <Fragment key={item.id}>{renderLeaf(item)}</Fragment>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      ) : null}

      <AlertDialog
        open={agentSessionPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAgentSessionPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta conversa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteAgentSession()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
