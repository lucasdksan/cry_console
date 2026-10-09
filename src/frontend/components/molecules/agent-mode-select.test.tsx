/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentModeSelect } from "@/frontend/components/molecules/agent-mode-select";

describe("AgentModeSelect", () => {
  it("mostra o modo atual no gatilho", () => {
    render(<AgentModeSelect mode="plan" onModeChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Modo: Plan" })).toBeInTheDocument();
  });

  it("desabilita o gatilho quando disabled", () => {
    render(<AgentModeSelect mode="agent" onModeChange={vi.fn()} disabled />);
    expect(screen.getByRole("combobox", { name: "Modo: Agent" })).toBeDisabled();
  });
});
