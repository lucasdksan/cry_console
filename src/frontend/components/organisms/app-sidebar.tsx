"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { logoutUser } from "@/backend/controllers/auth.controller";
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
  SidebarSeparator,
  useSidebar,
} from "@/frontend/components/ui/sidebar";
import {
  filterNavFooter,
  filterNavSections,
  navHasVisibleTargets,
} from "@/frontend/navigation/filter-nav";
import type {
  NavFooterItem,
  NavLeafItem,
  NavSectionItem,
} from "@/frontend/navigation/nav";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  sections: NavSectionItem[];
  footer: NavFooterItem[];
  slots?: Partial<Record<"session", React.ReactNode>>;
  onNavigate?: () => void;
};

function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  sections,
  footer,
  slots,
  onNavigate,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");

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

    const Icon = item.icon;
    const active = isNavItemActive(pathname, item.href);

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={active}
          render={<Link href={item.href} onClick={closeMobileNav} />}
        >
          {Icon ? <Icon /> : null}
          <span>{item.label}</span>
        </SidebarMenuButton>
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
                  <SidebarGroupLabel className="uppercase tracking-wide">
                    {section.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>{section.items.map(renderLeaf)}</SidebarMenu>
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
          <SidebarMenu>{filteredFooter.map(renderLeaf)}</SidebarMenu>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
