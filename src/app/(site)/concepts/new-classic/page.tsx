import type { Metadata } from "next";
import Link from "next/link";
import { ManagedImage } from "@/components/ui/ManagedImage";
import { weddingContent } from "@/features/design-concepts/content";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "The New Classic",
  description: "An editorial, heirloom-inspired wedding homepage concept.",
};

export default function NewClassicPage() {
  const [maya, julian] = weddingContent.firstNames;

  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#new-classic-main">
        Skip to main content
      </a>

      <aside className={styles.reviewBar} aria-label="Design review navigation">
        <Link href="/">← All concepts</Link>
        <span>The New Classic · 01 / 03</span>
      </aside>

      <header className={styles.header}>
        <Link
          className={styles.monogram}
          href="/concepts/new-classic"
          aria-label="Maya and Julian home"
        >
          M<span>/</span>J
        </Link>
        <nav aria-label="Wedding navigation">
          <a href="#story">Our story</a>
          <a href="#weekend">The day</a>
          <a href="#travel">Travel</a>
          <a href="#rsvp">RSVP</a>
        </nav>
      </header>

      <main id="new-classic-main">
        <section className={styles.hero} aria-labelledby="new-classic-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Together with their families</p>
            <h1 id="new-classic-title">
              <span>{maya}</span>
              <span className={styles.ampersand}>&</span>
              <span>{julian}</span>
            </h1>
            <p className={styles.invitation}>
              Invite you to celebrate their wedding in the Hudson Valley
            </p>
            <div className={styles.dateLockup}>
              <span>{weddingContent.date}</span>
              <span>{weddingContent.venue}</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroFrame}>
              <ManagedImage
                assetId="stock-wedding-outdoors"
                variantId="homeHero"
                sizes="(max-width: 52rem) 92vw, 52vw"
                className={styles.heroImage}
                preload
              />
            </div>
            <p className={styles.imageNote}>Briar Glen, New York · Late summer</p>
          </div>
        </section>

        <section id="story" className={styles.story} aria-labelledby="classic-story-title">
          <div className={styles.storyImageWrap}>
            <ManagedImage
              assetId="stock-wedding-path"
              variantId="storyPortrait"
              sizes="(max-width: 48rem) 84vw, 34vw"
              className={styles.storyImage}
            />
            <span className={styles.storyNumber} aria-hidden="true">
              08
            </span>
          </div>
          <div className={styles.storyCopy}>
            <p className={styles.sectionLabel}>How it began</p>
            <h2 id="classic-story-title">A rainy afternoon, one perfect record.</h2>
            {weddingContent.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className={styles.signature}>Maya & Julian</p>
          </div>
        </section>

        <section id="weekend" className={styles.weekend} aria-labelledby="classic-weekend-title">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionLabel}>Order of celebration</p>
            <h2 id="classic-weekend-title">The wedding day</h2>
            <p>Monday · September twentieth · two thousand twenty-seven</p>
          </div>
          <ol className={styles.schedule}>
            {weddingContent.schedule.map((item, index) => (
              <li key={item.time}>
                <span className={styles.scheduleNumber}>{String(index + 1).padStart(2, "0")}</span>
                <time>{item.time}</time>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="travel" className={styles.travel} aria-labelledby="classic-travel-title">
          <div className={styles.travelIntro}>
            <p className={styles.sectionLabel}>Make a weekend of it</p>
            <h2 id="classic-travel-title">A little way out of town.</h2>
            <p>
              Cedar House sits between the river and the hills, ninety minutes north of the city. We
              have arranged the details so all you need to do is arrive.
            </p>
          </div>
          <div className={styles.travelDetails}>
            {weddingContent.travel.map((item) => (
              <article key={item.label}>
                <p>{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="rsvp" className={styles.rsvp} aria-labelledby="classic-rsvp-title">
          <p className={styles.sectionLabel}>The pleasure of your company</p>
          <h2 id="classic-rsvp-title">Will you join us?</h2>
          <p>Please reply by {weddingContent.rsvpDeadline}.</p>
          <a href="mailto:maya-and-julian@example.com?subject=Wedding%20RSVP">Send your reply</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>{weddingContent.couple}</p>
        <p>{weddingContent.dateShort}</p>
        <p>{weddingContent.location}</p>
      </footer>
    </div>
  );
}
