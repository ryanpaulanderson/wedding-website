import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSiteAccessConfiguration,
  isSitePasswordGateEnabled,
  SITE_ACCESS_COOKIE_NAME,
  verifySiteAccessSession,
} from "@/lib/site-access";

type SiteLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function SiteLayout({ children }: SiteLayoutProps) {
  if (!isSitePasswordGateEnabled()) {
    return children;
  }

  const configuration = getSiteAccessConfiguration();

  if (!configuration) {
    redirect("/access?error=configuration");
  }

  const cookieStore = await cookies();
  const hasAccess = verifySiteAccessSession(
    cookieStore.get(SITE_ACCESS_COOKIE_NAME)?.value,
    configuration.sessionSecret,
  );

  if (!hasAccess) {
    redirect("/access");
  }

  return children;
}
