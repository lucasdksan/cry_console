/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RangeBar } from "@/frontend/components/atoms/range-bar";

describe("RangeBar", () => {
  it("expõe projeção no aria-valuenow", () => {
    render(
      <RangeBar
        fillValue={120}
        minMarker={80}
        maxMarker={100}
        tone="primary"
        ariaLabel="Projeção vs limites"
      />,
    );
    const bar = screen.getByRole("progressbar", {
      name: "Projeção vs limites",
    });
    expect(bar.getAttribute("aria-valuenow")).toBe("120");
    expect(bar.getAttribute("aria-valuemax")).toBe("120");
  });

  it("usa tom ok quando solicitado", () => {
    const { container } = render(
      <RangeBar
        fillValue={90}
        minMarker={80}
        maxMarker={100}
        tone="ok"
        ariaLabel="Faixa"
      />,
    );
    const fill = container.querySelector(".bg-\\[var\\(--status-ok\\)\\]");
    expect(fill).toBeTruthy();
  });
});
