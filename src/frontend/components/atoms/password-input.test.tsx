/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "@/frontend/components/atoms/password-input";

describe("PasswordInput", () => {
  it("inicia ocultando a senha", () => {
    render(<PasswordInput aria-label="Senha" />);

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(
      screen.getByRole("button", { name: "Mostrar senha" }),
    ).toBeInTheDocument();
  });

  it("alterna visibilidade e o rótulo do botão ao clicar", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);

    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    await user.click(toggle);

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Ocultar senha" }),
    ).toBeInTheDocument();
  });
});
