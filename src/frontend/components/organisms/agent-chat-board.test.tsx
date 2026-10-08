/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentChatBoard } from "@/frontend/components/organisms/agent-chat-board";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const actions = vi.hoisted(() => ({
  sendAgentMessage: vi.fn(),
  completeBrowserAgentTurn: vi.fn(),
  discardAgentTurn: vi.fn(),
  listAgentModelOptions: vi.fn(),
}));
const browserPrompt = vi.hoisted(() => ({
  generateChromePromptText: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/backend/controllers/agent.controller", () => ({
  ...actions,
  approveAgentPlan: vi.fn(),
  deleteAgentSessionAction: vi.fn(),
  renameAgentSessionAction: vi.fn(),
}));
vi.mock("@/backend/controllers/agent-skill.controller", () => ({
  fetchAgentSkillSlashCatalog: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/frontend/lib/browser/prompt", () => ({
  checkChromePromptReady: vi.fn().mockResolvedValue(false),
  generateChromePromptText: browserPrompt.generateChromePromptText,
}));

const workspaces = [{ id: "ws-1", name: "Loja Teste" }];

function renderLanding() {
  return render(
    <AgentChatBoard session={null} initialMessages={[]} workspaces={workspaces} />,
  );
}

async function waitForModelOptionsLoaded() {
  await waitFor(() =>
    expect(actions.listAgentModelOptions).toHaveBeenCalled(),
  );
  await waitFor(async () => {
    const lastCall = actions.listAgentModelOptions.mock.results.at(-1);
    expect(lastCall?.type).toBe("return");
    await lastCall?.value;
  });
}

async function sendFromLanding(text: string) {
  await waitForModelOptionsLoaded();
  const textarea = screen.getByPlaceholderText(
    "Descreva uma tarefa ou experimente um comando",
  );
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });
}

describe("AgentChatBoard", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.listAgentModelOptions.mockResolvedValue([
      {
        id: "platform",
        label: "gemini-test",
        source: "platform",
        groupLabel: "Plataforma",
        modelId: "gemini-test",
      },
    ]);
  });

  it("mantém o erro visível e restaura o texto quando a primeira mensagem falha", async () => {
    actions.sendAgentMessage.mockResolvedValue({
      ok: false,
      error: "Cota do provedor excedida.",
      retryable: true,
    });
    renderLanding();

    await sendFromLanding("Como está a conversão?");

    await waitFor(() => {
      expect(
        screen.getByText("Cota do provedor excedida."),
      ).toBeInTheDocument();
      expect(screen.getByText("O que podemos fazer?")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          "Descreva uma tarefa ou experimente um comando",
        ),
      ).toHaveValue("Como está a conversão?");
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("gera a resposta do navegador antes de abrir a nova sessão", async () => {
    actions.sendAgentMessage.mockResolvedValue({
      ok: true,
      sessionId: "s-1",
      needsBrowser: true,
      prompt: "prompt",
      userMessageId: "m-1",
    });
    browserPrompt.generateChromePromptText.mockResolvedValue("resposta");
    actions.completeBrowserAgentTurn.mockResolvedValue({
      ok: true,
      messages: [],
    });
    renderLanding();

    await sendFromLanding("Oi");

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/agente/s-1"));
    expect(actions.completeBrowserAgentTurn).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "s-1", userMessageId: "m-1" }),
    );
  });

  it("descarta o turno quando a geração no navegador falha", async () => {
    actions.sendAgentMessage.mockResolvedValue({
      ok: true,
      sessionId: "s-1",
      needsBrowser: true,
      prompt: "prompt",
      userMessageId: "m-1",
    });
    browserPrompt.generateChromePromptText.mockRejectedValue(
      new Error("Modelo do navegador indisponível."),
    );
    actions.discardAgentTurn.mockResolvedValue({ ok: true });
    renderLanding();

    await sendFromLanding("Oi");

    expect(
      await screen.findByText("Modelo do navegador indisponível."),
    ).toBeInTheDocument();
    expect(actions.discardAgentTurn).toHaveBeenCalledWith({
      sessionId: "s-1",
      userMessageId: "m-1",
      discardSession: true,
    });
    expect(router.push).not.toHaveBeenCalled();
  });
});
