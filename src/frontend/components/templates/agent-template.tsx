import type { AgentMessagePublic, AgentSessionPublic } from "@/backend/lib/agent/types";
import { AgentChatBoard } from "@/frontend/components/organisms/agent-chat-board";

type AgentTemplateProps = {
  session: AgentSessionPublic | null;
  messages: AgentMessagePublic[];
  workspaces: { id: string; name: string }[];
};

export function AgentTemplate({
  session,
  messages,
  workspaces,
}: AgentTemplateProps) {
  return (
    <AgentChatBoard
      key={session?.id ?? "new"}
      session={session}
      initialMessages={messages}
      workspaces={workspaces}
    />
  );
}
