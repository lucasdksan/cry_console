import { describe, expect, it } from "vitest";

import {
  deriveHelpCenterNavigationFromRepoPath,
  resolveHelpCenterChunkSection,
} from "@/backend/lib/agent/help-center-section";

describe("deriveHelpCenterNavigationFromRepoPath", () => {
  it("monta trilha a partir do path do repositório", () => {
    expect(
      deriveHelpCenterNavigationFromRepoPath(
        "docs/pt/tutorials/admin-vtex/admin-vtex-comece-aqui.md",
      ),
    ).toBe("Tutoriais > Admin VTEX");
  });
});

describe("resolveHelpCenterChunkSection", () => {
  it("combina trilha da página com cabeçalho do chunk", () => {
    expect(
      resolveHelpCenterChunkSection(
        "Tutoriais > Admin VTEX",
        "## Menu de navegação\nTexto",
      ),
    ).toBe("Tutoriais > Admin VTEX > Menu de navegação");
  });
});
