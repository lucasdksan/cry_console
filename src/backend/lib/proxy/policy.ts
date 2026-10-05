import { sanitizeRedirectPath } from "@/backend/lib/auth/redirect";
import {
  findPublicRoute,
  REDIRECT_WHEN_NOT_AUTHENTICATED,
} from "@/backend/lib/proxy/routes";

export type ProxyRedirectInput = {
  pathname: string;
  search: string;
  searchParams: Pick<URLSearchParams, "get">;
  isLoggedIn: boolean;
};

export function resolveProxyRedirect({
  pathname,
  search,
  searchParams,
  isLoggedIn,
}: ProxyRedirectInput): string | null {
  const publicRoute = findPublicRoute(pathname);

  if (!isLoggedIn && !publicRoute) {
    const redirectUrl = new URL(REDIRECT_WHEN_NOT_AUTHENTICATED, "http://local");
    redirectUrl.searchParams.set("to", `${pathname}${search}`);
    return `${redirectUrl.pathname}${redirectUrl.search}`;
  }

  if (isLoggedIn && publicRoute?.whenAuthenticated === "redirect") {
    const redirectTo = sanitizeRedirectPath(searchParams.get("to"));
    return redirectTo;
  }

  return null;
}
