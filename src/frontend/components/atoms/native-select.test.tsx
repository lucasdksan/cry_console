/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NativeSelect } from "@/frontend/components/atoms/native-select";

describe("NativeSelect", () => {
  it("renderiza as opções filhas", () => {
    render(
      <NativeSelect aria-label="Fuso horário">
        <option value="utc">UTC</option>
        <option value="br">Brasil</option>
      </NativeSelect>,
    );

    expect(screen.getByRole("combobox", { name: "Fuso horário" })).toHaveTextContent(
      "UTC",
    );
    expect(screen.getByRole("option", { name: "Brasil" })).toBeInTheDocument();
  });

  it("repassa disabled e name para o select nativo", () => {
    render(
      <NativeSelect name="timezone" disabled aria-label="Fuso">
        <option value="utc">UTC</option>
      </NativeSelect>,
    );

    const select = screen.getByRole("combobox", { name: "Fuso" });
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute("name", "timezone");
  });
});
