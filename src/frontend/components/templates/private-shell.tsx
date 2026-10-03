"use client";

import { useMemo } from "react";

import {
  defaultNavFooter,
  type NavFooterItem,
} from "@/frontend/navigation/nav";
import {
  buildPrivateNavSections,
  type WorkspaceNavSummary,
} from "@/frontend/navigation/workspace-nav";
import { AppSidebar } from "@/frontend/components/organisms/app-sidebar";
import { BrandLogo } from "@/frontend/components/atoms/brand-logo";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/frontend/components/ui/sidebar";
import { Separator } from "@/frontend/components/ui/separator";

type PrivateShellProps = {
  children: React.ReactNode;
  workspaces: WorkspaceNavSummary[];
  footer?: NavFooterItem[];
  slots?: Partial<Record<"session", React.ReactNode>>;
  workspaceLimitReached?: boolean;
};

export function PrivateShell({
  children,
  workspaces,
  footer = defaultNavFooter,
  slots,
  workspaceLimitReached = false,
}: PrivateShellProps) {
  const sections = useMemo(
    () => buildPrivateNavSections(workspaces),
    [workspaces],
  );
  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "22rem",
          "--sidebar-width-mobile": "22rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        sections={sections}
        footer={footer}
        slots={slots}
        workspaceLimitReached={workspaceLimitReached}
      />
      <SidebarInset className="min-h-svh">
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 md:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <BrandLogo className="justify-start" size="sm" showName={false} />
        </header>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 md:px-6 md:py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
