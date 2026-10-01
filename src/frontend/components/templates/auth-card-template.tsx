import { BrandLogo } from "@/frontend/components/atoms/brand-logo";
import { cn } from "@/frontend/lib/utils";

type AuthCardTemplateProps = {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthCardTemplate({
  title,
  children,
  footer,
  className,
}: AuthCardTemplateProps) {
  return (
    <div className={cn("flex w-full flex-col gap-8", className)}>
      <BrandLogo className="justify-center lg:justify-start" />
      <div className="flex flex-col gap-6">
        <h1 className="text-center text-2xl font-bold text-muted-foreground lg:text-left">
          {title}
        </h1>
        {children}
      </div>
      {footer}
    </div>
  );
}
