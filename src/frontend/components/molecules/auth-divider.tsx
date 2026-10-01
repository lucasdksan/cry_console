import { Separator } from "@/frontend/components/ui/separator";

export function AuthDivider() {
  return (
    <div className="relative flex items-center py-1">
      <Separator className="flex-1" />
      <span className="px-3 text-sm text-muted-foreground">ou</span>
      <Separator className="flex-1" />
    </div>
  );
}
