import Image from "next/image";

import { cn } from "@/frontend/lib/utils";

type BrandLogoProps = {
  className?: string;
  showName?: boolean;
  size?: "sm" | "md";
};

export function BrandLogo({
  className,
  showName = true,
  size = "md",
}: BrandLogoProps) {
  const signetClass = size === "sm" ? "size-9" : "size-11";
  const textClass =
    size === "sm"
      ? "text-lg leading-none"
      : "text-xl leading-none";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden",
          signetClass,
        )}
      >
        <Image
          src="/brand/logo/signet.svg"
          alt="Cry Console"
          width={48}
          height={48}
          className={cn(
            "max-w-none object-contain object-center scale-[1.18]",
            signetClass,
          )}
          priority
          unoptimized
        />
      </span>
      {showName ? (
        <span
          className={cn(
            "font-[family-name:var(--font-heading)] font-bold text-foreground",
            textClass,
          )}
        >
          Cry Console
        </span>
      ) : null}
    </div>
  );
}
