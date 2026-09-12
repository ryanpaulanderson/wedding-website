import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  getAdminAccessConfiguration,
  hasAdminSession,
  isAdminAuthenticationRequired,
} from "@/lib/admin-access";
import { parseEarlyDeclinePage } from "@/features/early-declines/pagination";
import { getEarlyDeclines } from "@/features/early-declines/admin";
import { reviewDecline, retryDeclineEmail } from "./actions";
import styles from "./page.module.css";
export const metadata: Metadata = {
  title: "Early notices · Admin",
  robots: { index: false, follow: false, nocache: true },
};
export const maxDuration = 120;
const statuses = {
  PENDING: "Waiting to send",
  ACCEPTED: "Accepted by email provider",
  FAILED: "Sending failed",
  PAUSED: "Not sent",
  NEEDS_REVIEW: "Check delivery in Resend before retrying",
};
const reasons: Record<string, string> = {
  configuration: "Email configuration needs attention.",
  "non-production": "Sending was paused. Retry to send this email.",
  encryption: "Encryption key needs attention.",
  provider: "Email provider rejected the attempt.",
  network: "Email service could not be reached.",
  delivery: "Delivery was interrupted.",
  "delivery-window-expired": "Automatic retry stopped to avoid sending a duplicate.",
};
export default async function EarlyDeclinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  if (isAdminAuthenticationRequired()) {
    const configuration = getAdminAccessConfiguration();
    if (!configuration || !(await hasAdminSession(configuration))) redirect("/admin");
  }
  const params = await searchParams;
  const pageValue = parseEarlyDeclinePage(params.page);
  const snapshot = await getEarlyDeclines(pageValue);
  return (
    <main className={styles.page}>
      <Link href="/admin">Back to admin overview</Link>
      <h1>Early notices: unable to attend</h1>
      <p>
        Save-the-date replies for invitation planning. These notices do not change formal RSVP
        totals. Mark a notice reviewed after updating your guest list.
      </p>
      {params.result === "reviewed" && <p role="status">Review status updated.</p>}
      {params.result === "retried" && (
        <p role="status">Retry checked. See the current email status below.</p>
      )}
      {params.result === "error" && (
        <p role="alert">The change could not be saved. Please try again.</p>
      )}
      {!snapshot ? (
        <p role="status">
          Early notices are temporarily unavailable. Check the database connection and migrations.
        </p>
      ) : (
        <>
          <p>
            <strong>{snapshot.total}</strong> notices · <strong>{snapshot.unreviewed}</strong>{" "}
            awaiting review
          </p>
          {snapshot.notices.length === 0 && <p>No notices on this page.</p>}
          <ul className={styles.notices}>
            {snapshot.notices.map((notice) => (
              <li key={notice.id}>
                <article>
                  <h2>{notice.names}</h2>
                  <p>
                    <a href={`mailto:${encodeURIComponent(notice.email)}`}>{notice.email}</a>
                  </p>
                  <p>
                    Submitted{" "}
                    <time dateTime={notice.createdAt.toISOString()}>
                      {notice.createdAt.toLocaleString("en-US", {
                        timeZone: "America/New_York",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      ET
                    </time>
                  </p>
                  <p>{notice.reviewedAt ? "Reviewed" : "Awaiting review"}</p>
                  <form action={reviewDecline}>
                    <input type="hidden" name="page" value={pageValue} />
                    <input type="hidden" name="id" value={notice.id} />
                    <input type="hidden" name="reviewed" value={notice.reviewedAt ? "no" : "yes"} />
                    <button type="submit">
                      {notice.reviewedAt ? "Mark unreviewed" : "Mark reviewed"}
                    </button>
                  </form>
                  <ul className={styles.emails}>
                    {notice.emails.map((email) => (
                      <li key={email.id}>
                        <p>
                          <strong>
                            {email.kind === "GUEST_CONFIRMATION"
                              ? "Guest confirmation"
                              : "Ryan’s encrypted notification"}
                          </strong>
                          : {statuses[email.status]}
                        </p>
                        {email.errorCode && reasons[email.errorCode] && (
                          <p>{reasons[email.errorCode]}</p>
                        )}
                        {email.providerId && (
                          <p className={styles.provider}>Provider reference: {email.providerId}</p>
                        )}
                        {(email.status === "PENDING" ||
                          email.status === "FAILED" ||
                          email.status === "PAUSED") && (
                          <form action={retryDeclineEmail}>
                            <input type="hidden" name="page" value={pageValue} />
                            <input type="hidden" name="id" value={email.id} />
                            <button type="submit">
                              Retry{" "}
                              {email.kind === "GUEST_CONFIRMATION"
                                ? "confirmation"
                                : "notification"}
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ul>
          <nav aria-label="Notice pages" className={styles.pagination}>
            {pageValue > 1 && <Link href={`?page=${pageValue - 1}`}>Previous page</Link>}
            <span>Page {pageValue}</span>
            {pageValue * 25 < snapshot.total && (
              <Link href={`?page=${pageValue + 1}`}>Next page</Link>
            )}
          </nav>
          <p>
            “Accepted” means the provider received the email. Check Resend for delivery or bounce
            details. Emails are sent in any environment with Resend configured.
          </p>
        </>
      )}
    </main>
  );
}
