export type PublicRoute = {
  path: string;
  whenAuthenticated: "redirect" | "next";
};

export const REDIRECT_WHEN_NOT_AUTHENTICATED = "/entrar";

export const publicRoutes = [
  { path: "/entrar", whenAuthenticated: "redirect" },
  { path: "/cadastro", whenAuthenticated: "redirect" },
  { path: "/esqueci-senha", whenAuthenticated: "redirect" },
  { path: "/redefinir-senha", whenAuthenticated: "redirect" },
  { path: "/", whenAuthenticated: "next" },
] as const satisfies readonly PublicRoute[];

const authRateLimitPrefixes = [
  "/entrar",
  "/cadastro",
  "/esqueci-senha",
  "/redefinir-senha",
] as const;

export function matchesRoute(routePath: string, actualPath: string): boolean {
  if (routePath === actualPath) {
    return true;
  }

  if (routePath.includes(":")) {
    const pattern = `^${routePath.replace(/:[^/]+/g, "[^/]+")}$`;
    return new RegExp(pattern).test(actualPath);
  }

  return false;
}

export function findPublicRoute(pathname: string): PublicRoute | undefined {
  return publicRoutes.find((route) => matchesRoute(route.path, pathname));
}

export function isAuthRateLimitPath(pathname: string): boolean {
  return authRateLimitPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
