/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentWorkspaceSelect } from "@/frontend/components/molecules/agent-workspace-select";

const choices = [
  { id: "w1", name: "Clovis Calçados" },
  { id: "w2", name: "N1.AG" },
];

describe("AgentWorkspaceSelect", () => {
  it("mostra a loja selecionada no gatilho", () => {
    render(
      <AgentWorkspaceSelect
        mode="agent"
        workspaceId="w2"
        workspaceChoices={choices}
        onWorkspaceIdChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Loja: N1.AG" })).toBeInTheDocument();
  });

  it("indica ausência de loja no modo Ask", () => {
    render(
      <AgentWorkspaceSelect
        mode="ask"
        workspaceId={null}
        workspaceChoices={choices}
        onWorkspaceIdChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("combobox", { name: "Loja: Sem loja (Ask)" }),
    ).toBeInTheDocument();
  });

  it("renderiza só o rótulo quando a loja está travada", () => {
    render(
      <AgentWorkspaceSelect
        mode="agent"
        workspaceId="w1"
        workspaceChoices={choices}
        onWorkspaceIdChange={vi.fn()}
        locked
      />,
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Clovis Calçados")).toBeInTheDocument();
  });
});
