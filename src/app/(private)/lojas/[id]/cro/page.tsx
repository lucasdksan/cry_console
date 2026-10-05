import { notFound, redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { getWorkspacePageAudit } from "@/backend/controllers/page-audit.controller";
import {
  findWorkspaceForUser,
  getUserActiveWorkspaceId,
  setActiveWorkspaceForUser,
} from "@/backend/models/workspace.model";
import { CroReportBoard } from "@/frontend/components/organisms/cro-report-board";

type CroPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LojaCroPage({ params }: CroPageProps) {
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

  const result = await getWorkspacePageAudit(workspace.id);
  if (!result.ok) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRO</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.name} · conversão heurística e contexto do funil
        </p>
      </div>
      <CroReportBoard
        workspaceId={workspace.id}
        siteUrl={workspace.siteUrl}
        initial={result.data}
      />
    </div>
  );
}
