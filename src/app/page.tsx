import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="page-title">
        <p className={styles.eyebrow}>Wedding website</p>
        <h1 id="page-title">Project foundation</h1>
        <p>
          The application shell, quality tooling, and test harness are ready for the wedding
          experience to be designed and built.
        </p>
      </section>
    </main>
  );
}
