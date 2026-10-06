/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormField } from "@/frontend/components/atoms/form-field";

describe("FormField", () => {
  it("associa o label ao campo via htmlFor", () => {
    render(
      <FormField id="email" label="E-mail">
        <input id="email" />
      </FormField>,
    );

    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });

  it("não exibe mensagem de erro quando error está ausente", () => {
    render(
      <FormField id="name" label="Nome">
        <input id="name" />
      </FormField>,
    );

    expect(screen.queryByText("Campo obrigatório")).not.toBeInTheDocument();
  });

  it("exibe mensagem de erro quando error está definido", () => {
    render(
      <FormField id="name" label="Nome" error="Campo obrigatório">
        <input id="name" />
      </FormField>,
    );

    expect(screen.getByText("Campo obrigatório")).toBeInTheDocument();
  });
});
