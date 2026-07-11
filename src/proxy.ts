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

function isAccessRoute(pathname: string): boolean {
  return pathname === "/access" || pathname.startsWith("/access/");
}

function isAppRouterRequest(request: NextRequest): boolean {
  return (
    request.headers.get("rsc") === "1" ||
    request.headers.has("next-action") ||
    request.headers.get("accept")?.includes("text/x-component") === true
  );
}

function applyPrivateHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(name, value);
  }

  return response;
}

export function proxy(request: NextRequest) {
  if (!isSitePasswordGateEnabled()) {
    return NextResponse.next();
  }

  if (isAccessRoute(request.nextUrl.pathname)) {
    return applyPrivateHeaders(NextResponse.next());
  }

  const configuration = getSiteAccessConfiguration();
  const token = request.cookies.get(SITE_ACCESS_COOKIE_NAME)?.value;

  if (configuration && verifySiteAccessSession(token, configuration.sessionSecret)) {
    return applyPrivateHeaders(NextResponse.next());
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
    return applyPrivateHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const redirectStatus = request.method === "GET" || request.method === "HEAD" ? 307 : 303;

  return applyPrivateHeaders(NextResponse.redirect(accessUrl, redirectStatus));
}

export const config = {
  matcher: ["/((?!_next/static|_next/webpack-hmr).*)"],
};
