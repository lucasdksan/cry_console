import { notFound, redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { getWorkspaceAvisos } from "@/backend/controllers/alert.controller";
import {
  findWorkspaceForUser,
  getUserActiveWorkspaceId,
  setActiveWorkspaceForUser,
} from "@/backend/models/workspace.model";
import { AvisosBoard } from "@/frontend/components/organisms/avisos-board";
type AvisosPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LojaAvisosPage({ params }: AvisosPageProps) {
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

  const result = await getWorkspaceAvisos(workspace.id, "month");
  if (!result.ok) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Avisos</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.name} · metas e ritmo por semana ou mês calendário
        </p>
      </div>
      <AvisosBoard workspaceId={workspace.id} initial={result.data} />
    </div>
  );
}
