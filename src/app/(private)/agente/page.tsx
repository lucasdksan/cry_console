import { auth } from "@/backend/auth";
import { listWorkspaceSummariesForUser } from "@/backend/models/workspace.model";
import { AgentTemplate } from "@/frontend/components/templates/agent-template";
import { redirect } from "next/navigation";

export default async function AgentePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const workspaces = await listWorkspaceSummariesForUser(session.user.id);

  return (
    <AgentTemplate session={null} messages={[]} workspaces={workspaces} />
  );
}
