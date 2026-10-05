import { auth } from "@/backend/auth";
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
