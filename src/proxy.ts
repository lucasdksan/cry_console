import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/backend/auth";
import {
  AUTH_WINDOW_MS,
  checkAuthRateLimit,
  getClientIp,
} from "@/backend/lib/auth-rate-limit";
import { isAuthRateLimitPath } from "@/backend/lib/proxy-routes";
import { resolveProxyRedirect } from "@/backend/lib/proxy-policy";

function nextWithPathname(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-middleware-pathname", req.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function tooManyAttemptsResponse() {
  return new NextResponse("Muitas tentativas. Tente novamente em breve.", {
    status: 429,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(Math.ceil(AUTH_WINDOW_MS / 1000)),
    },
  });
}

export default auth((request) => {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (isAuthRateLimitPath(pathname)) {
    const ip = getClientIp(request);
    if (!checkAuthRateLimit(ip)) {
      return tooManyAttemptsResponse();
    }
  }

  const redirectPath = resolveProxyRedirect({
    pathname,
    search: nextUrl.search,
    searchParams: nextUrl.searchParams,
    isLoggedIn: Boolean(request.auth),
  });

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, nextUrl));
  }

  return nextWithPathname(request);
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
