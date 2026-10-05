import { getAgentSessionDetail } from "@/backend/controllers/agent.controller";
import { listWorkspaceSummariesForUser } from "@/backend/models/workspace.model";
import { AgentTemplate } from "@/frontend/components/templates/agent-template";
import { auth } from "@/backend/auth";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function AgenteSessionPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const { sessionId } = await params;
  const detail = await getAgentSessionDetail(sessionId);
  if (!detail.ok) {
    notFound();
  }

  const workspaces = await listWorkspaceSummariesForUser(session.user.id);

  return (
    <AgentTemplate
      session={detail.session}
      messages={detail.messages}
      workspaces={workspaces}
    />
  );
}
