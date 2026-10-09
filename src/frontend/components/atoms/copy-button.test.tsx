/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CopyButton } from "@/frontend/components/atoms/copy-button";

describe("CopyButton", () => {
  it("copia o valor para a área de transferência e indica sucesso", async () => {
    const user = userEvent.setup();
    render(<CopyButton value="<script></script>" label="Copiar script" />);

    await user.click(screen.getByRole("button", { name: "Copiar script" }));

    await expect(navigator.clipboard.readText()).resolves.toBe(
      "<script></script>",
    );
    expect(screen.getByRole("button", { name: "Copiado" })).toBeInTheDocument();
  });
});
