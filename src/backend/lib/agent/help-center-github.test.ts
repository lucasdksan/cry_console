import { describe, expect, it } from "vitest";

import { helpCenterRepoPathToLink } from "@/backend/lib/agent/help-center-github";

describe("helpCenterRepoPathToLink", () => {
  it("mapeia tutoriais pelo slug do arquivo", () => {
    expect(
      helpCenterRepoPathToLink(
        "docs/pt/tutorials/admin-vtex/admin-vtex-comece-aqui.md",
      ),
    ).toEqual({
      url: "https://help.vtex.com/pt/docs/tutorials/admin-vtex-comece-aqui",
      label: "Admin Vtex Comece Aqui",
      source: "tutorials",
    });
  });

  it("mapeia faq e announcements", () => {
    expect(
      helpCenterRepoPathToLink(
        "docs/pt/faq/authentication/cliente-nao-consegue-fazer-login.md",
      )?.url,
    ).toBe("https://help.vtex.com/pt/faq/cliente-nao-consegue-fazer-login");

    expect(
      helpCenterRepoPathToLink(
        "docs/pt/announcements/2026/foo/bar-comunicado.md",
      )?.source,
    ).toBe("announcements");
  });
});
