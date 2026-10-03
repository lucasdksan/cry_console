import { auth } from "@/backend/auth";
import {
  countWorkspacesForUser,
  listWorkspaceSummariesForUser,
} from "@/backend/models/workspace.model";
import { MAX_WORKSPACES_PER_USER } from "@/backend/lib/workspace-policy";
import { NavSessionSlot } from "@/frontend/components/molecules/nav-session-slot";
import { PrivateShell } from "@/frontend/components/templates/private-shell";
import { redirect } from "next/navigation";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const [workspaces, workspaceCount] = await Promise.all([
    listWorkspaceSummariesForUser(session.user.id),
    countWorkspacesForUser(session.user.id),
  ]);

  return (
    <PrivateShell
      workspaces={workspaces}
      workspaceLimitReached={workspaceCount >= MAX_WORKSPACES_PER_USER}
      slots={{
        session: (
          <NavSessionSlot
            email={session.user.email}
            name={session.user.name}
            image={session.user.image}
          />
        ),
      }}
    >
      {children}
    </PrivateShell>
  );
}
