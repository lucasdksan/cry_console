import { notFound, redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { getWorkspaceAnalysis } from "@/backend/controllers/analysis.controller";
import {
  findWorkspaceForUser,
  getUserActiveWorkspaceId,
  setActiveWorkspaceForUser,
} from "@/backend/models/workspace.model";
import { AnalysisBoard } from "@/frontend/components/organisms/analysis-board";

type AnalisePageProps = {
  params: Promise<{ id: string }>;
};

export default async function LojaAnalisePage({ params }: AnalisePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const { id } = await params;
  const workspace = await findWorkspaceForUser(session.user.id, id);
  if (!workspace) {
    notFound();
  }

  const activeId = await getUserActiveWorkspaceId(session.user.id);
  if (activeId !== workspace.id) {
    await setActiveWorkspaceForUser(session.user.id, workspace.id);
  }

  const result = await getWorkspaceAnalysis(workspace.id);
  if (!result.ok) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análise</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.name} · saúde do e-commerce e plano de ação
        </p>
      </div>
      <AnalysisBoard
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        initial={result.data}
      />
    </div>
  );
}
