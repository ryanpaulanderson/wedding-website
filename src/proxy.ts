import { NextResponse, type NextRequest } from "next/server";
import {
  getSiteAccessConfiguration,
  isSitePasswordGateEnabled,
  sanitizeReturnTo,
  SITE_ACCESS_COOKIE_NAME,
  verifySiteAccessSession,
} from "@/lib/site-access";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

const ADMIN_RESPONSE_HEADERS = {
  ...PRIVATE_RESPONSE_HEADERS,
  "Content-Security-Policy": "frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

function isAccessRoute(pathname: string): boolean {
  return pathname === "/access" || pathname.startsWith("/access/");
}

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAppRouterRequest(request: NextRequest): boolean {
  return (
    request.headers.get("rsc") === "1" ||
    request.headers.has("next-action") ||
    request.headers.get("accept")?.includes("text/x-component") === true
  );
}

function applyHeaders(
  response: NextResponse,
  headers: Readonly<Record<string, string>>,
): NextResponse {
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }

  return response;
}

export function proxy(request: NextRequest) {
  const responseHeaders = isAdminRoute(request.nextUrl.pathname)
    ? ADMIN_RESPONSE_HEADERS
    : PRIVATE_RESPONSE_HEADERS;

  if (!isSitePasswordGateEnabled()) {
    const response = NextResponse.next();

    return isAdminRoute(request.nextUrl.pathname)
      ? applyHeaders(response, ADMIN_RESPONSE_HEADERS)
      : response;
  }

  if (isAccessRoute(request.nextUrl.pathname)) {
    return applyHeaders(NextResponse.next(), PRIVATE_RESPONSE_HEADERS);
  }

  const configuration = getSiteAccessConfiguration();
  const token = request.cookies.get(SITE_ACCESS_COOKIE_NAME)?.value;

  if (configuration && verifySiteAccessSession(token, configuration.sessionSecret)) {
    return applyHeaders(NextResponse.next(), responseHeaders);
  }

  const accessUrl = request.nextUrl.clone();
  accessUrl.pathname = "/access";
  accessUrl.search = "";

  if (!configuration) {
    accessUrl.searchParams.set("error", "configuration");
  } else if (request.method === "GET" || request.method === "HEAD" || isAppRouterRequest(request)) {
    accessUrl.searchParams.set(
      "returnTo",
      sanitizeReturnTo(`${request.nextUrl.pathname}${request.nextUrl.search}`),
    );
  } else {
    return applyHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      responseHeaders,
    );
  }

  const redirectStatus = request.method === "GET" || request.method === "HEAD" ? 307 : 303;

  return applyHeaders(NextResponse.redirect(accessUrl, redirectStatus), responseHeaders);
}

export const config = {
  matcher: ["/((?!_next/static|_next/webpack-hmr).*)"],
};
