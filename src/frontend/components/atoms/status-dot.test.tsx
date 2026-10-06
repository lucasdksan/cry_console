/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusDot } from "@/frontend/components/atoms/status-dot";

describe("StatusDot", () => {
  it("expõe o rótulo no title e no texto sr-only", () => {
    render(<StatusDot state="ok" label="Google Analytics conectado" />);

    const root = screen.getByTitle("Google Analytics conectado");
    expect(root).toBeInTheDocument();
    expect(screen.getByText("Google Analytics conectado")).toHaveClass(
      "sr-only",
    );
  });

  it("marca o ponto visual como decorativo", () => {
    const { container } = render(
      <StatusDot state="failed" label="Falha na coleta" />,
    );

    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeTruthy();
  });
});
