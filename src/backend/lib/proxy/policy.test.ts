import { describe, expect, it } from "vitest";

import { resolveProxyRedirect } from "@/backend/lib/proxy/policy";

describe("resolveProxyRedirect", () => {
  it("redireciona visitantes para /entrar com retorno seguro", () => {
    const redirect = resolveProxyRedirect({
      pathname: "/dashboard",
      search: "",
      searchParams: new URLSearchParams(),
      isLoggedIn: false,
    });

    expect(redirect).toBe("/entrar?to=%2Fdashboard");
  });

  it("permite rotas públicas sem sessão", () => {
    const redirect = resolveProxyRedirect({
      pathname: "/entrar",
      search: "",
      searchParams: new URLSearchParams(),
      isLoggedIn: false,
    });

    expect(redirect).toBeNull();
  });

  it("redireciona usuários autenticados fora das telas de auth", () => {
    const redirect = resolveProxyRedirect({
      pathname: "/entrar",
      search: "",
      searchParams: new URLSearchParams({ to: "/dashboard" }),
      isLoggedIn: true,
    });

    expect(redirect).toBe("/dashboard");
  });

  it("mantém a home acessível com sessão", () => {
    const redirect = resolveProxyRedirect({
      pathname: "/",
      search: "",
      searchParams: new URLSearchParams(),
      isLoggedIn: true,
    });

    expect(redirect).toBeNull();
  });
});
