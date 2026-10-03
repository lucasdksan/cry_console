import Link from "next/link";

import { Button } from "@/frontend/components/ui/button";

type SourceErrorPanelProps = {
  title: string;
  message?: string;
  workspaceId: string;
};

export function SourceErrorPanel({
  title,
  message,
  workspaceId,
}: SourceErrorPanelProps) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-[var(--radius-lg)] border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        className="w-fit rounded-[var(--radius-md)]"
        render={<Link href={`/lojas/${workspaceId}`} />}
      >
        Revisar credenciais
      </Button>
    </div>
  );
}
