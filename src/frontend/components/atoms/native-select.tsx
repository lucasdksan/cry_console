import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/frontend/lib/utils";

type NativeSelectProps = React.ComponentProps<"select">;

export function NativeSelect({
  className,
  children,
  ...props
}: NativeSelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full min-w-0 appearance-none rounded-[var(--radius-md)] border border-input bg-transparent py-1 pl-3 pr-9 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
