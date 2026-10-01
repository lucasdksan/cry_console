import Image from "next/image";

import { cn } from "@/frontend/lib/utils";

type BrandLogoProps = {
  className?: string;
  showName?: boolean;
};

export function BrandLogo({ className, showName = true }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <Image
        src="/brand/logo/signet.svg"
        alt="Cry Console"
        width={48}
        height={48}
        className="size-11 shrink-0"
        priority
        unoptimized
      />
      {showName ? (
        <span className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
          Cry Console
        </span>
      ) : null}
    </div>
  );
}
