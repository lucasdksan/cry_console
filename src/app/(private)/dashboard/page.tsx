import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";

import { auth } from "@/backend/auth";
import {
  getUserActiveWorkspaceId,
  listWorkspacesForOverview,
} from "@/backend/models/workspace.model";
import { OverviewTemplate } from "@/frontend/components/templates/overview-template";
import { Button } from "@/frontend/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/frontend/components/ui/empty";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const [workspaces, activeWorkspaceId] = await Promise.all([
    listWorkspacesForOverview(session.user.id),
    getUserActiveWorkspaceId(session.user.id),
  ]);

  if (workspaces.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight sm:text-3xl">
            Visão geral
          </h1>
        </header>
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle>Nenhuma loja cadastrada</EmptyTitle>
            <EmptyDescription>
              Crie até três workspaces para ver o resumo das integrações aqui.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              className="rounded-[var(--radius-md)]"
              render={<Link href="/lojas/nova" />}
            >
              Nova loja
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const initialFocusId =
    activeWorkspaceId &&
    workspaces.some((workspace) => workspace.id === activeWorkspaceId)
      ? activeWorkspaceId
      : workspaces[0].id;

  return (
    <OverviewTemplate
      workspaces={workspaces}
      initialFocusId={initialFocusId}
    />
  );
}
