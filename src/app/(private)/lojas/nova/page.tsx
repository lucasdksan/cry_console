import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { MAX_WORKSPACES_PER_USER } from "@/backend/lib/workspace-policy";
import { countWorkspacesForUser } from "@/backend/models/workspace.model";
import { WorkspaceForm } from "@/frontend/components/organisms/workspace-form";
import { buttonVariants } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";

export default async function NovaLojaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const count = await countWorkspacesForUser(session.user.id);
  if (count >= MAX_WORKSPACES_PER_USER) {
    redirect("/lojas");
  }

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
          <h1 className="text-2xl font-semibold tracking-tight">Nova loja</h1>
          <p className="text-sm text-muted-foreground">
            Informe nome e URL. Integrações podem ser preenchidas agora ou depois.
          </p>
        </div>
      </div>
      <WorkspaceForm mode="create" />
    </div>
  );
}
