"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  createAdminSession,
  getAdminAccessConfiguration,
  getAdminAccessCookieOptions,
  requireAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-access";

export async function signInToAdmin(formData: FormData) {
  const configuration = getAdminAccessConfiguration();

  if (!configuration) {
    redirect("/admin?error=unavailable");
  }

  const isValidPassword = await verifyAdminPassword(formData.get("password"), configuration);

  if (!isValidPassword) {
    redirect("/admin?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_ACCESS_COOKIE_NAME,
    createAdminSession(configuration.sessionSecret),
    getAdminAccessCookieOptions(),
  );

  redirect("/admin");
}

export async function signOutOfAdmin() {
  await requireAdminSession();

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ACCESS_COOKIE_NAME, "", {
    ...getAdminAccessCookieOptions(),
    maxAge: 0,
  });

  redirect("/admin");
}
