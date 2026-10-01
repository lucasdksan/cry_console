import Link from "next/link";

import { cn } from "@/frontend/lib/utils";

type AuthFooterLinkProps = {
  href: string;
  prefix: string;
  highlight: string;
  className?: string;
};

export function AuthFooterLink({
  href,
  prefix,
  highlight,
  className,
}: AuthFooterLinkProps) {
  return (
    <p className={cn("text-center text-sm text-muted-foreground", className)}>
      {prefix}{" "}
      <Link href={href} className="font-medium text-link hover:underline">
        {highlight}
      </Link>
    </p>
  );
}
