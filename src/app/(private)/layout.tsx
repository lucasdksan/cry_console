import { auth } from "@/backend/auth";
import { listAgentSessionsForUser } from "@/backend/models/agent-session.model";
import {
  countWorkspacesForUser,
  listWorkspaceSummariesForUser,
} from "@/backend/models/workspace.model";
import { MAX_WORKSPACES_PER_USER } from "@/backend/lib/workspace/policy";
import { AccountSettingsSessionTrigger } from "@/frontend/components/organisms/account-settings-session-trigger";
import { PrivateShell } from "@/frontend/components/templates/private-shell";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const [workspaces, workspaceCount, agentSessions] = await Promise.all([
    listWorkspaceSummariesForUser(session.user.id),
    countWorkspacesForUser(session.user.id),
    listAgentSessionsForUser(session.user.id, 15),
  ]);

  return (
    <PrivateShell
      workspaces={workspaces}
      agentSessions={agentSessions.map((s) => ({
        id: s.id,
        title: s.title,
        workspaceName: s.workspace?.name ?? null,
      }))}
      workspaceLimitReached={workspaceCount >= MAX_WORKSPACES_PER_USER}
      slots={{
        session: (
          <AccountSettingsSessionTrigger
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
