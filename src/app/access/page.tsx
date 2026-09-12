import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSiteAccessConfiguration,
  isSitePasswordGateEnabled,
  sanitizeReturnTo,
  SITE_ACCESS_COOKIE_NAME,
  verifySiteAccessSession,
} from "@/lib/site-access";
import { lockSite, unlockSite } from "./actions";
import styles from "./page.module.css";
import weddingTree from "../../../public/brand/wedding-tree-logo.webp";

export const metadata: Metadata = {
  title: "Welcome to our wedding",
  robots: {
    follow: false,
    index: false,
    nocache: true,
  },
};

type AccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccessPage({ searchParams }: AccessPageProps) {
  if (!isSitePasswordGateEnabled()) {
    redirect("/");
  }

  const parameters = await searchParams;
  const returnTo = sanitizeReturnTo(firstValue(parameters.returnTo));
  const configuration = getSiteAccessConfiguration();
  const cookieStore = await cookies();
  const hasAccess = Boolean(
    configuration &&
    verifySiteAccessSession(
      cookieStore.get(SITE_ACCESS_COOKIE_NAME)?.value,
      configuration.sessionSecret,
    ),
  );
  const hasConfigurationError = !configuration;
  const hasPasswordError = !hasConfigurationError && firstValue(parameters.error) === "invalid";

  return (
    <main className={styles.page}>
      <Image
        alt=""
        aria-hidden="true"
        className={styles.tree}
        fill
        preload
        src={weddingTree}
        unoptimized
      />
      <section className={styles.card} aria-labelledby="access-title">
        <p className={styles.eyebrow}>Caroline &amp; Ryan</p>
        <h1 id="access-title">Welcome to our wedding</h1>

        {hasConfigurationError ? (
          <p className={styles.error} role="alert">
            Our website is temporarily unavailable. Please try again later or email Ryan for help.
          </p>
        ) : hasAccess ? (
          <>
            <p className={styles.status}>This browser has access for the next 30 days.</p>
            <div className={styles.actions}>
              <Link className={styles.link} href={returnTo}>
                Continue to site
              </Link>
              <form action={lockSite}>
                <button className={styles.button} type="submit">
                  Lock this browser
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className={styles.intro}>
              We’re so glad you’re here! Our site is password protected to help reduce web scraping.
              Enter the password included on your Save the Date to join us.
            </p>
            <form className={styles.form} action={unlockSite}>
              <input name="returnTo" type="hidden" value={returnTo} />
              <label className={styles.label} htmlFor="site-password">
                Password
              </label>
              <input
                aria-describedby={hasPasswordError ? "password-error" : undefined}
                aria-invalid={hasPasswordError || undefined}
                autoComplete="current-password"
                autoFocus={hasPasswordError}
                className={styles.input}
                id="site-password"
                maxLength={256}
                name="password"
                required
                type="password"
              />
              {hasPasswordError ? (
                <p className={styles.error} id="password-error" role="alert">
                  That password did not work. Try again.
                </p>
              ) : null}
              <button className={styles.button} type="submit">
                View site
              </button>
            </form>
          </>
        )}
        <p className={styles.help}>
          Lost your Save the Date or don’t know the password? Email Ryan at{" "}
          <a className={styles.link} href="mailto:ryan@ryanpaulanderson.com">
            ryan@ryanpaulanderson.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
