import { describe, expect, it } from "vitest";

import {
  normalizeGscSiteUrl,
  pickGscSiteUrl,
} from "@/backend/lib/google/gsc-site-url";

describe("normalizeGscSiteUrl", () => {
  it("garante barra final em URL prefix", () => {
    expect(normalizeGscSiteUrl("https://www.loja.com.br")).toBe(
      "https://www.loja.com.br/",
    );
    expect(normalizeGscSiteUrl("https://www.loja.com.br/")).toBe(
      "https://www.loja.com.br/",
    );
  });
});

describe("pickGscSiteUrl", () => {
  it("prefere o prefixo exato quando a credencial tem acesso", () => {
    expect(
      pickGscSiteUrl("https://www.loja.com.br/", [
        { siteUrl: "sc-domain:loja.com.br", permissionLevel: "siteOwner" },
        {
          siteUrl: "https://www.loja.com.br/",
          permissionLevel: "siteFullUser",
        },
      ]),
    ).toBe("https://www.loja.com.br/");
  });

  it("cai para a propriedade de domínio quando o prefixo não está liberado", () => {
    expect(
      pickGscSiteUrl("https://www.clovis.com.br/", [
        { siteUrl: "sc-domain:clovis.com.br", permissionLevel: "siteOwner" },
      ]),
    ).toBe("sc-domain:clovis.com.br");
  });

  it("ignora propriedade não verificada", () => {
    expect(
      pickGscSiteUrl("https://www.loja.com.br/", [
        {
          siteUrl: "https://www.loja.com.br/",
          permissionLevel: "siteUnverifiedUser",
        },
      ]),
    ).toBeNull();
  });
});
