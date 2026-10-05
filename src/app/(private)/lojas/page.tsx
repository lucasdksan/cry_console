import { Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { MAX_WORKSPACES_PER_USER } from "@/backend/lib/workspace/policy";
import {
  countWorkspacesForUser,
  listWorkspaceSummariesForUser,
} from "@/backend/models/workspace.model";
import { buttonVariants } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

export default async function LojasPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const [workspaces, count] = await Promise.all([
    listWorkspaceSummariesForUser(session.user.id),
    countWorkspacesForUser(session.user.id),
  ]);

  const canCreate = count < MAX_WORKSPACES_PER_USER;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lojas</h1>
          <p className="text-sm text-muted-foreground">
            Até {MAX_WORKSPACES_PER_USER} workspaces por conta. Credenciais ficam
            cifradas no servidor.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/lojas/nova"
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            Nova loja
          </Link>
        ) : null}
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma loja ainda</CardTitle>
            <CardDescription>
              Crie um workspace para armazenar VTEX, Clarity e Google Analytics.
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent>
              <Link href="/lojas/nova" className={buttonVariants()}>
                Criar primeira loja
              </Link>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Link
                href={`/lojas/${workspace.id}`}
                className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <Store
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="font-medium">{workspace.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
