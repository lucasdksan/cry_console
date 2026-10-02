"use client";

import {
  defaultNavFooter,
  defaultNavSections,
  type NavFooterItem,
  type NavSectionItem,
} from "@/frontend/navigation/nav";
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
  sections?: NavSectionItem[];
  footer?: NavFooterItem[];
  slots?: Partial<Record<"session", React.ReactNode>>;
};

export function PrivateShell({
  children,
  sections = defaultNavSections,
  footer = defaultNavFooter,
  slots,
}: PrivateShellProps) {
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
      <AppSidebar sections={sections} footer={footer} slots={slots} />
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
