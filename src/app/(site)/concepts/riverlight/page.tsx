import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ManagedImage } from "@/components/ui/ManagedImage";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Riverlight",
  description:
    "A river-facing, modern wedding homepage concept for Caroline and Ryan at District Winery.",
};

const detailCards = [
  {
    label: "When",
    title: "Saturday, March 13, 2027",
    description: "Save the date for an evening celebration in Washington, DC.",
  },
  {
    label: "Where",
    title: "District Winery",
    description: "385 Water Street SE · Navy Yard · Washington, DC",
  },
  {
    label: "The day",
    title: "Details forthcoming",
    description: "Schedule, travel, and dress code details will be shared with the invitation.",
  },
  {
    label: "Your reply",
    title: "RSVP opens soon",
    description: "Formal invitations and reply instructions will follow.",
  },
] as const;

export default function RiverlightPage() {
  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#riverlight-main">
        Skip to main content
      </a>

      <aside className={styles.reviewBar} aria-label="Design review navigation">
        <Link href="/">← All concepts</Link>
        <span>Riverlight · 04 / 04</span>
      </aside>

      <header className={styles.header}>
        <Link
          className={styles.wordmark}
          href="/concepts/riverlight"
          aria-label="Caroline and Ryan home"
        >
          C<span aria-hidden="true">/</span>R
        </Link>
        <nav aria-label="Wedding navigation">
          <a href="#place">The place</a>
          <a href="#story">Our story</a>
          <a href="#details">Details</a>
          <a href="#rsvp">RSVP</a>
        </nav>
      </header>

      <main id="riverlight-main">
        <section className={styles.hero} aria-labelledby="riverlight-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>An invitation to the water’s edge</p>
            <Image
              src="/brand/wedding-tree-logo-riverlight.webp"
              alt=""
              width={900}
              height={900}
              sizes="(max-width: 48rem) 9rem, 12rem"
              className={styles.heroMark}
            />
            <h1 id="riverlight-title">
              <span>Caroline</span> <span>&amp; Ryan</span>
            </h1>
            <div className={styles.heroDetails}>
              <p>Saturday, March 13, 2027</p>
              <p>District Winery · Washington, DC</p>
            </div>
          </div>

          <figure className={styles.heroFigure}>
            <ManagedImage
              assetId="dc-rooftop-sunset"
              variantId="homeHero"
              sizes="(max-width: 48rem) 100vw, 58vw"
              className={styles.heroImage}
              preload
            />
            <figcaption>Washington, DC · Riverlight at sunset</figcaption>
          </figure>
        </section>

        <section id="place" className={styles.place} aria-labelledby="place-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>01 · The place</p>
            <h2 id="place-title">Meet us by the river.</h2>
            <p>
              An urban winery at the water’s edge, framed by city light, warm wood, and a view
              across the Anacostia.
            </p>
          </div>

          <div className={styles.venueCard}>
            <p className={styles.venueKicker}>Navy Yard · Washington, DC</p>
            <h3>District Winery</h3>
            <address>
              385 Water Street SE
              <br />
              Washington, DC 20003
            </address>
            <a href="https://www.districtwinery.com/dc-wedding-venue/">
              Visit the venue website <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section id="story" className={styles.story} aria-labelledby="story-title">
          <div className={styles.storyHeader}>
            <p className={styles.sectionLabel}>02 · A through line</p>
            <h2 id="story-title">A garden, a question, a tree.</h2>
            <p>
              The tree in the proposal garden became the mark for everything that comes next—a small
              piece of Granada carried into the celebration.
            </p>
          </div>

          <div className={styles.storyGrid}>
            <figure className={styles.storyWideFigure}>
              <ManagedImage
                assetId="alhambra-garden-portrait"
                variantId="storyWide"
                sizes="(max-width: 52rem) 100vw, 62vw"
                className={styles.storyImage}
              />
              <figcaption>The Alhambra gardens · Granada</figcaption>
            </figure>

            <figure className={styles.storyPortraitFigure}>
              <ManagedImage
                assetId="granada-proposal-ring"
                variantId="storyPortrait"
                sizes="(max-width: 52rem) 78vw, 26vw"
                className={styles.storyImage}
              />
              <figcaption>The question, answered</figcaption>
            </figure>

            <p className={styles.storyNote}>
              One tree.
              <br />
              One ring.
              <br />
              One very good day.
            </p>
          </div>
        </section>

        <section className={styles.gallery} aria-labelledby="gallery-title">
          <div className={styles.galleryHeader}>
            <p className={styles.sectionLabel}>03 · Along the way</p>
            <h2 id="gallery-title">A life with a view.</h2>
          </div>

          <div className={styles.galleryGrid}>
            <figure className={styles.receptionFigure}>
              <ManagedImage
                assetId="reception-formal-portrait"
                variantId="storyPortrait"
                sizes="(max-width: 48rem) 88vw, 28vw"
                className={styles.galleryImage}
              />
              <figcaption>Dressed for the occasion</figcaption>
            </figure>

            <figure className={styles.oceanFigure}>
              <ManagedImage
                assetId="oceanfront-portrait"
                variantId="storyWide"
                sizes="(max-width: 48rem) 100vw, 58vw"
                className={styles.galleryImage}
              />
              <figcaption>Always finding the water</figcaption>
            </figure>

            <figure className={styles.goldenGateFigure}>
              <ManagedImage
                assetId="golden-gate-formal"
                variantId="storyPortrait"
                sizes="(max-width: 48rem) 88vw, 29vw"
                className={styles.galleryImage}
              />
              <figcaption>San Francisco Bay</figcaption>
            </figure>
          </div>
        </section>

        <section id="details" className={styles.details} aria-labelledby="details-title">
          <div className={styles.detailsHeader}>
            <p className={styles.sectionLabel}>04 · The essentials</p>
            <h2 id="details-title">The shape of the day.</h2>
            <p>Start with the date and the place. We’ll fill in the rest together.</p>
          </div>

          <div className={styles.detailGrid}>
            {detailCards.map((detail) => (
              <article key={detail.label}>
                <p>{detail.label}</p>
                <h3>{detail.title}</h3>
                <p>{detail.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="rsvp" className={styles.rsvp} aria-labelledby="rsvp-title">
          <Image
            src="/brand/wedding-tree-logo-riverlight.webp"
            alt=""
            width={900}
            height={900}
            sizes="(max-width: 48rem) 70vw, 34rem"
            className={styles.rsvpMark}
          />
          <div className={styles.rsvpContent}>
            <p>Formal invitation to follow</p>
            <h2 id="rsvp-title">Save the date. We’ll meet you by the river.</h2>
            <p className={styles.rsvpStatus}>RSVP opens soon</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Caroline &amp; Ryan</p>
        <p>March 13, 2027</p>
        <p>Washington, DC</p>
      </footer>
    </div>
  );
}
