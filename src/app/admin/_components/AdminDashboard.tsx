import type { AdminDashboardSnapshot, AdminDashboardTotals } from "@/features/admin/dashboard-data";
import { signOutOfAdmin } from "../actions";
import styles from "./AdminDashboard.module.css";

type MetricDefinition = {
  key: keyof AdminDashboardTotals;
  label: string;
};

const metricDefinitions: readonly MetricDefinition[] = [
  { key: "households", label: "Households" },
  { key: "invitedGuests", label: "Invited guests" },
  { key: "responsesReceived", label: "Responses received" },
  { key: "attendingGuests", label: "Attending guests" },
];

type AdminDashboardProps = {
  snapshot: AdminDashboardSnapshot;
};

export function AdminDashboard({ snapshot }: AdminDashboardProps) {
  const isConnected = snapshot.status === "ready";
  const recentResponses = isConnected ? snapshot.recentResponses : [];

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#admin-content">
        Skip to dashboard
      </a>

      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.monogram} aria-hidden="true">
            C<span>/</span>R
          </span>
          <span className={styles.product}>Administration</span>
        </div>
        <form action={signOutOfAdmin}>
          <button className={styles.signOut} type="submit">
            Sign out
          </button>
        </form>
      </header>

      <main className={styles.main} id="admin-content">
        <section className={styles.intro} aria-labelledby="dashboard-title">
          <div>
            <p className={styles.eyebrow}>Wedding operations</p>
            <h1 id="dashboard-title">Overview</h1>
            <p className={styles.lede}>
              A private workspace for guest invitations and RSVP activity.
            </p>
          </div>
          <p className={styles.connectionStatus}>
            <span className={styles.statusDot} aria-hidden="true" />
            {isConnected ? "Database connected" : "Database not connected"}
          </p>
        </section>

        <section className={styles.metricsSection} aria-labelledby="metrics-title">
          <h2 className={styles.sectionTitle} id="metrics-title">
            RSVP summary
          </h2>
          <ul className={styles.metrics}>
            {metricDefinitions.map((metric) => (
              <li key={metric.key}>
                <p>{metric.label}</p>
                <strong>{isConnected ? snapshot.totals[metric.key].toLocaleString() : "—"}</strong>
                <span>{isConnected ? "Current total" : "Awaiting data source"}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.lowerGrid}>
          <section className={styles.activity} aria-labelledby="activity-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.sectionKicker}>Latest activity</p>
                <h2 id="activity-title">Recent RSVP responses</h2>
              </div>
              <p>{isConnected ? `${recentResponses.length} responses` : "Awaiting data source"}</p>
            </div>

            {recentResponses.length === 0 ? (
              <div className={styles.emptyState}>
                <span aria-hidden="true">01</span>
                <div>
                  <h3>No responses to show</h3>
                  <p>
                    Recent household submissions will appear here after the RSVP database is
                    connected.
                  </p>
                </div>
              </div>
            ) : (
              <ul className={styles.responseList}>
                {recentResponses.map((response) => (
                  <li key={response.householdId}>
                    <div>
                      <strong>{response.householdName}</strong>
                      <span>{response.attendance}</span>
                    </div>
                    <span>{response.guestCount} guests</span>
                    <time dateTime={response.submittedAt}>{response.submittedAt}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className={styles.dataSource} aria-labelledby="data-source-title">
            <p className={styles.sectionKicker}>System status</p>
            <h2 id="data-source-title">Data source</h2>
            <p>
              {isConnected
                ? "The secure dashboard data source is connected for this request."
                : "This portal is running with its secure application shell. PostgreSQL reads are intentionally inactive in this first release."}
            </p>
            <dl>
              <div>
                <dt>Provider</dt>
                <dd>{isConnected ? "Connected" : "Not configured"}</dd>
              </div>
              <div>
                <dt>Last refresh</dt>
                <dd>{isConnected ? "Current request" : "Unavailable"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Caroline &amp; Ryan</p>
        <p>Private administration</p>
      </footer>
    </div>
  );
}
