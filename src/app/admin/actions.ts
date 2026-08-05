"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  createAdminSession,
  getAdminAccessConfiguration,
  getAdminAccessCookieOptions,
  verifyAdminPassword,
} from "@/lib/admin-access";
import { adminLoginRateLimiter, createAdminLoginRateLimitKey } from "@/lib/admin-login-rate-limit";

export async function signInToAdmin(formData: FormData) {
  const configuration = getAdminAccessConfiguration();

  if (!configuration) {
    redirect("/admin?error=unavailable");
  }

  const requestHeaders = await headers();
  const rateLimitKey = createAdminLoginRateLimitKey(requestHeaders, configuration.sessionSecret);

  if (!adminLoginRateLimiter.consume(rateLimitKey)) {
    redirect("/admin?error=invalid");
  }

  const isValidPassword = await verifyAdminPassword(formData.get("password"), configuration);

  if (!isValidPassword) {
    redirect("/admin?error=invalid");
  }

  adminLoginRateLimiter.reset(rateLimitKey);

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_ACCESS_COOKIE_NAME,
    createAdminSession(configuration.sessionSecret),
    getAdminAccessCookieOptions(),
  );

  redirect("/admin");
}

export async function signOutOfAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ACCESS_COOKIE_NAME, "", {
    ...getAdminAccessCookieOptions(),
    maxAge: 0,
  });

  redirect("/admin");
}
