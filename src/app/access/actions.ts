"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSiteAccessSession,
  getSiteAccessConfiguration,
  getSiteAccessCookieOptions,
  isSitePasswordGateEnabled,
  sanitizeReturnTo,
  SITE_ACCESS_COOKIE_NAME,
  verifySitePassword,
} from "@/lib/site-access";

function accessErrorUrl(error: "configuration" | "invalid", returnTo = "/"): string {
  const searchParams = new URLSearchParams({ error });

  if (returnTo !== "/") {
    searchParams.set("returnTo", returnTo);
  }

  return `/access?${searchParams.toString()}`;
}

export async function unlockSite(formData: FormData) {
  if (!isSitePasswordGateEnabled()) {
    redirect("/");
  }

  const returnTo = sanitizeReturnTo(formData.get("returnTo"));
  const configuration = getSiteAccessConfiguration();

  if (!configuration) {
    redirect(accessErrorUrl("configuration", returnTo));
  }

  const isValidPassword = await verifySitePassword(
    formData.get("password"),
    configuration.passwordHash,
  );

  if (!isValidPassword) {
    redirect(accessErrorUrl("invalid", returnTo));
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SITE_ACCESS_COOKIE_NAME,
    createSiteAccessSession(configuration.sessionSecret),
    getSiteAccessCookieOptions(),
  );

  redirect(returnTo);
}

export async function lockSite() {
  const cookieStore = await cookies();
  cookieStore.set(SITE_ACCESS_COOKIE_NAME, "", {
    ...getSiteAccessCookieOptions(),
    maxAge: 0,
  });

  redirect("/access");
}
