import type { Metadata } from "next";
import Link from "next/link";
import { ManagedImage } from "@/components/ui/ManagedImage";
import { weddingContent } from "@/features/design-concepts/content";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "After Dark",
  description: "A cinematic, architectural evening wedding homepage concept.",
};

export default function AfterDarkPage() {
  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#after-dark-main">
        Skip to main content
      </a>

      <aside className={styles.reviewBar} aria-label="Design review navigation">
        <Link href="/">← All concepts</Link>
        <span>After Dark · 03 / 04</span>
      </aside>

      <header className={styles.header}>
        <Link
          className={styles.wordmark}
          href="/concepts/after-dark"
          aria-label="Maya and Julian home"
        >
          M<span>×</span>J
        </Link>
        <nav aria-label="Wedding navigation">
          <a href="#story">Story</a>
          <a href="#timeline">Timeline</a>
          <a href="#travel">Travel</a>
          <a href="#rsvp">RSVP ↗</a>
        </nav>
      </header>

      <main id="after-dark-main">
        <section className={styles.hero} aria-labelledby="after-dark-title">
          <ManagedImage
            assetId="stock-wedding-outdoors"
            variantId="homeHero"
            sizes="100vw"
            className={styles.heroImage}
            preload
          />
          <div className={styles.heroShade} />
          <p className={styles.heroKicker}>Cedar House · Hudson Valley</p>
          <h1 id="after-dark-title">
            Maya
            <span aria-hidden="true">/</span>
            Julian
          </h1>
          <p className={styles.heroDate}>{weddingContent.dateShort}</p>
          <p className={styles.scrollNote}>Scroll for the invitation ↓</p>
        </section>

        <div className={styles.factStrip} aria-label="Wedding details">
          <p>
            <span>Date</span>
            {weddingContent.date}
          </p>
          <p>
            <span>Place</span>
            {weddingContent.venue}
          </p>
          <p>
            <span>Coordinates</span>
            42.18° N · 73.92° W
          </p>
        </div>

        <section id="story" className={styles.story} aria-labelledby="dark-story-title">
          <div className={styles.storyLead}>
            <p className={styles.sectionLabel}>Chapter 01 · The beginning</p>
            <h2 id="dark-story-title">Somewhere between the first song and the last train.</h2>
          </div>
          <div className={styles.storyBody}>
            {weddingContent.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <figure className={styles.storyFigure}>
            <ManagedImage
              assetId="stock-wedding-path"
              variantId="storyPortrait"
              sizes="(max-width: 50rem) 86vw, 32vw"
              className={styles.storyImage}
            />
            <figcaption>Eight years, two cities, and one very good dog later.</figcaption>
          </figure>
          <blockquote>
            “Stay for dinner.
            <br />
            Stay for the dancing.”
          </blockquote>
        </section>

        <section id="timeline" className={styles.timeline} aria-labelledby="dark-timeline-title">
          <div className={styles.timelineHeader}>
            <p className={styles.sectionLabel}>Chapter 02 · September 20</p>
            <h2 id="dark-timeline-title">
              Four moments.
              <br />
              One long night.
            </h2>
          </div>
          <ol>
            {weddingContent.schedule.map((item, index) => (
              <li key={item.time}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <time>{item.time}</time>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="travel" className={styles.travel} aria-labelledby="dark-travel-title">
          <div className={styles.travelImageWrap}>
            <ManagedImage
              assetId="stock-wedding-outdoors"
              variantId="storyWide"
              sizes="(max-width: 50rem) 100vw, 54vw"
              className={styles.travelImage}
            />
            <p>
              90 minutes north
              <br />
              of New York City
            </p>
          </div>
          <div className={styles.travelContent}>
            <p className={styles.sectionLabel}>Chapter 03 · The coordinates</p>
            <h2 id="dark-travel-title">Leave the city lights behind.</h2>
            <div className={styles.travelGrid}>
              {weddingContent.travel.map((item) => (
                <article key={item.label}>
                  <p>{item.label}</p>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="rsvp" className={styles.rsvp} aria-labelledby="dark-rsvp-title">
          <p>Final chapter</p>
          <h2 id="dark-rsvp-title">Are you in?</h2>
          <div className={styles.rsvpMeta}>
            <p>Reply by {weddingContent.rsvpDeadline}</p>
            <a href="mailto:maya-and-julian@example.com?subject=Wedding%20RSVP">Enter RSVP</a>
          </div>
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
