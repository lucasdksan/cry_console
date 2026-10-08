import { notFound, redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { loadWorkspaceObservability } from "@/backend/controllers/observability-query";
import {
  findWorkspaceForUser,
  getUserActiveWorkspaceId,
  setActiveWorkspaceForUser,
} from "@/backend/models/workspace.model";
import { ObservabilityBoard } from "@/frontend/components/organisms/observability-board";

type ObservabilidadePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; pageType?: string; page?: string }>;
};

export default async function LojaObservabilidadePage({
  params,
  searchParams,
}: ObservabilidadePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const { id } = await params;
  const query = await searchParams;

  const workspace = await findWorkspaceForUser(session.user.id, id);
  if (!workspace) {
    notFound();
  }

  const activeId = await getUserActiveWorkspaceId(session.user.id);
  if (activeId !== workspace.id) {
    await setActiveWorkspaceForUser(session.user.id, workspace.id);
  }

  const data = await loadWorkspaceObservability(
    session.user.id,
    workspace.id,
    query.period,
    query.pageType ?? query.page,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Observabilidade
        </h1>
        <p className="text-sm text-muted-foreground">
          {workspace.name} · avisos de falhas, performance e sessões do site
        </p>
      </div>
      <ObservabilityBoard workspaceId={workspace.id} data={data} />
    </div>
  );
}
