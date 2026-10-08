"use client";

import { useRouter, usePathname } from "next/navigation";

import type {
  ObservabilityPageFilter,
  ObservabilityPeriod,
} from "@/backend/lib/sentry/insights";
import { ToggleGroup, ToggleGroupItem } from "@/frontend/components/ui/toggle-group";

const PERIOD_OPTIONS: Array<{ value: ObservabilityPeriod; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "14d", label: "14 dias" },
];

const PAGE_OPTIONS: Array<{ value: ObservabilityPageFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "home", label: "Home" },
  { value: "plp", label: "PLP" },
  { value: "pdp", label: "PDP" },
];

type ObservabilityFiltersProps = {
  period: ObservabilityPeriod;
  pageFilter: ObservabilityPageFilter;
  disabled?: boolean;
};

export function ObservabilityFilters({
  period,
  pageFilter,
  disabled,
}: ObservabilityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(nextPeriod: ObservabilityPeriod, nextPage: ObservabilityPageFilter) {
    const params = new URLSearchParams();
    params.set("period", nextPeriod);
    params.set("pageType", nextPage);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Período</span>
        <ToggleGroup
          value={[period]}
          onValueChange={(values) => {
            const next = values[0] as ObservabilityPeriod | undefined;
            if (!next || disabled) return;
            navigate(next, pageFilter);
          }}
          className="flex w-full flex-wrap gap-1"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              size="sm"
              disabled={disabled}
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Página</span>
        <ToggleGroup
          value={[pageFilter]}
          onValueChange={(values) => {
            const next = values[0] as ObservabilityPageFilter | undefined;
            if (!next || disabled) return;
            navigate(period, next);
          }}
          className="flex w-full flex-wrap gap-1"
        >
          {PAGE_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              size="sm"
              disabled={disabled}
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
