"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { useIsMobile } from "@/frontend/hooks/use-mobile";
import { cn } from "@/frontend/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";

export type AccountSettingsSection = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  content: React.ReactNode;
};

type AccountSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: AccountSettingsSection[];
};

function SectionNavButton({
  section,
  selected,
  onSelect,
}: {
  section: AccountSettingsSection;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = section.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0 opacity-80" aria-hidden /> : null}
      <span className="truncate">{section.label}</span>
    </button>
  );
}

function SectionPanel({ section }: { section: AccountSettingsSection }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {section.label}
        </h2>
        {section.description ? (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{section.content}</div>
    </div>
  );
}

export function AccountSettingsDialog({
  open,
  onOpenChange,
  sections,
}: AccountSettingsDialogProps) {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = React.useState(
    () => sections[0]?.id ?? "account",
  );

  const resolvedSectionId = sections.some(
    (section) => section.id === activeSection,
  )
    ? activeSection
    : (sections[0]?.id ?? "account");

  const active =
    sections.find((section) => section.id === resolvedSectionId) ?? sections[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(720px,calc(100vh-2.5rem))] max-h-[90vh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 pr-14">
          <DialogTitle className="font-heading text-xl font-semibold">
            Configurações
          </DialogTitle>
          <DialogDescription>
            Conta e preferências do assistente de IA.
          </DialogDescription>
        </DialogHeader>

        {isMobile ? (
          <Tabs
            value={resolvedSectionId}
            onValueChange={setActiveSection}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <TabsList
              variant="default"
              className="h-auto w-full shrink-0 justify-stretch gap-1 rounded-none border-b border-border bg-transparent p-2"
            >
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="flex-1 cursor-pointer gap-1.5 px-3 py-2 data-active:bg-muted data-active:text-foreground"
                  >
                    {Icon ? <Icon className="size-4" aria-hidden /> : null}
                    {section.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {sections.map((section) => (
              <TabsContent
                key={section.id}
                value={section.id}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
              >
                <SectionPanel section={section} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[12.5rem_1fr]">
            <nav
              className="flex flex-col gap-1 border-r border-border bg-card/30 p-3"
              aria-label="Seções de configurações"
            >
              {sections.map((section) => (
                <SectionNavButton
                  key={section.id}
                  section={section}
                  selected={section.id === resolvedSectionId}
                  onSelect={() => setActiveSection(section.id)}
                />
              ))}
            </nav>
            <div className="min-h-0 overflow-y-auto px-6 py-5">
              {active ? <SectionPanel section={active} /> : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
