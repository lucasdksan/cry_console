/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentWorkflowBlock } from "@/frontend/components/molecules/agent-workflow-block";

describe("AgentWorkflowBlock", () => {
  it("renderiza nós empilhados", () => {
    render(
      <AgentWorkflowBlock
        part={{
          type: "workflow",
          title: "Fluxo",
          phases: [
            {
              id: "p1",
              title: "Semana 1",
              steps: [
                { id: "1", label: "Passo A" },
                { id: "2", label: "Passo B", detail: "Detalhe" },
              ],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Passo A")).toBeInTheDocument();
    expect(screen.getByText("Passo B")).toBeInTheDocument();
    expect(screen.getByText("Detalhe")).toBeInTheDocument();
  });
});
