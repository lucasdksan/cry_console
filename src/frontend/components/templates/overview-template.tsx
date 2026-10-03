import type { WorkspaceOverviewListItem } from "@/backend/models/workspace.model";
import { OverviewBoard } from "@/frontend/components/organisms/overview-board";

type OverviewTemplateProps = {
  workspaces: WorkspaceOverviewListItem[];
  initialFocusId: string;
};

export function OverviewTemplate({
  workspaces,
  initialFocusId,
}: OverviewTemplateProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight sm:text-3xl">
          Visão geral
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Resumo das integrações VTEX, GA4, Google Search e Clarity da loja em
          foco. Escolha uma loja acima para comparar status.
        </p>
      </header>
      <OverviewBoard
        workspaces={workspaces}
        initialFocusId={initialFocusId}
      />
    </div>
  );
}
