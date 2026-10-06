import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
    ...rest
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    unoptimized?: boolean;
  }) =>
    createElement("img", {
      src,
      alt,
      width,
      height,
      className,
      ...rest,
    }),
}));
