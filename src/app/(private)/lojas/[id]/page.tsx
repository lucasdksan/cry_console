import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { activateWorkspace } from "@/backend/controllers/workspace.controller";
import {
  findWorkspaceForUser,
  getUserActiveWorkspaceId,
} from "@/backend/models/workspace.model";
import { isSentryServerConfigured } from "@/backend/lib/sentry";
import { findObservabilityForUserWorkspace } from "@/backend/models/observability.model";
import { WorkspaceDeleteZone } from "@/frontend/components/molecules/workspace-delete-zone";
import { ObservabilityForm } from "@/frontend/components/organisms/observability-form";
import { WorkspaceForm } from "@/frontend/components/organisms/workspace-form";
import { buttonVariants } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";

type LojaDetalhePageProps = {
  params: Promise<{ id: string }>;
};

export default async function LojaDetalhePage({ params }: LojaDetalhePageProps) {
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
    await activateWorkspace(workspace.id);
  }

  const observability = await findObservabilityForUserWorkspace(
    session.user.id,
    workspace.id,
  );
  const scriptBaseUrl =
    process.env.AUTH_URL?.trim().replace(/\/+$/, "") ?? "http://localhost:3000";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/lojas"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0",
          )}
        >
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">
            Workspace ativo · credenciais write-only após salvar
          </p>
        </div>
      </div>
      <WorkspaceForm mode="edit" workspace={workspace} />
      {observability ? (
        <ObservabilityForm
          workspaceId={workspace.id}
          observability={observability}
          sentryConfigured={isSentryServerConfigured()}
          scriptBaseUrl={scriptBaseUrl}
        />
      ) : null}
      <WorkspaceDeleteZone
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
    </div>
  );
}
