/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandLogo } from "@/frontend/components/atoms/brand-logo";

describe("BrandLogo", () => {
  it("renderiza a imagem com alt da marca", () => {
    render(<BrandLogo />);

    expect(screen.getByRole("img", { name: "Cry Console" })).toHaveAttribute(
      "src",
      "/brand/logo/signet.svg",
    );
  });

  it("oculta o nome da marca quando showName é false", () => {
    render(<BrandLogo showName={false} />);

    expect(screen.getByRole("img", { name: "Cry Console" })).toBeInTheDocument();
    expect(screen.queryByText("Cry Console")).not.toBeInTheDocument();
  });
});
