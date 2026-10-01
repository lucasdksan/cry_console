import { describe, expect, it } from "vitest";

import {
  findPublicRoute,
  isAuthRateLimitPath,
  matchesRoute,
} from "@/backend/lib/proxy-routes";

describe("matchesRoute", () => {
  it("compara rotas estáticas", () => {
    expect(matchesRoute("/entrar", "/entrar")).toBe(true);
    expect(matchesRoute("/entrar", "/cadastro")).toBe(false);
  });

  it("compara rotas com parâmetros", () => {
    expect(matchesRoute("/store/:slug", "/store/minha-loja")).toBe(true);
    expect(matchesRoute("/store/:slug", "/store/a/b")).toBe(false);
  });
});

describe("findPublicRoute", () => {
  it("identifica rotas públicas de autenticação", () => {
    expect(findPublicRoute("/entrar")?.whenAuthenticated).toBe("redirect");
    expect(findPublicRoute("/cadastro")?.whenAuthenticated).toBe("redirect");
  });

  it("trata a home como pública", () => {
    expect(findPublicRoute("/")?.whenAuthenticated).toBe("next");
  });

  it("retorna undefined para rotas privadas", () => {
    expect(findPublicRoute("/dashboard")).toBeUndefined();
  });
});

describe("isAuthRateLimitPath", () => {
  it("aplica rate limit nas rotas de auth", () => {
    expect(isAuthRateLimitPath("/entrar")).toBe(true);
    expect(isAuthRateLimitPath("/cadastro")).toBe(true);
    expect(isAuthRateLimitPath("/dashboard")).toBe(false);
  });
});
