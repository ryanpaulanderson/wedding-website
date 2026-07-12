import type { Metadata } from "next";
import Link from "next/link";
import { ManagedImage } from "@/components/ui/ManagedImage";
import { weddingContent } from "@/features/design-concepts/content";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Field Notes",
  description: "A colorful, organic garden-weekend wedding homepage concept.",
};

export default function FieldNotesPage() {
  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#field-notes-main">
        Skip to main content
      </a>

      <aside className={styles.reviewBar} aria-label="Design review navigation">
        <Link href="/">← All concepts</Link>
        <span>Field Notes · 02 / 03</span>
      </aside>

      <header className={styles.header}>
        <Link
          className={styles.wordmark}
          href="/concepts/field-notes"
          aria-label="Maya and Julian home"
        >
          Maya <span>&</span> Julian
        </Link>
        <nav aria-label="Wedding navigation">
          <a href="#story">Story</a>
          <a href="#weekend">Weekend</a>
          <a href="#travel">Stay</a>
          <a className={styles.navRsvp} href="#rsvp">
            RSVP
          </a>
        </nav>
      </header>

      <main id="field-notes-main">
        <section className={styles.hero} aria-labelledby="field-notes-title">
          <span className={styles.heroFlower} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A very good day in the valley</p>
            <h1 id="field-notes-title">
              Meet us
              <br />
              in the <em>garden.</em>
            </h1>
            <p className={styles.heroIntro}>
              We are filling Cedar House with music, dinner, and all of our favorite people. We hope
              that includes you.
            </p>
            <a className={styles.heroCta} href="#weekend">
              See the weekend <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className={styles.collage} aria-label="Wedding portraits">
            <div className={styles.widePhoto}>
              <ManagedImage
                assetId="stock-wedding-outdoors"
                variantId="storyWide"
                sizes="(max-width: 52rem) 86vw, 48vw"
                className={styles.collageImage}
                preload
              />
            </div>
            <div className={styles.portraitPhoto}>
              <ManagedImage
                assetId="stock-wedding-path"
                variantId="storyPortrait"
                sizes="(max-width: 52rem) 42vw, 19vw"
                className={styles.collageImage}
              />
            </div>
            <div className={styles.dateBadge}>
              <span>Monday</span>
              <strong>20</strong>
              <span>September · 2027</span>
            </div>
            <p className={styles.locationNote}>{weddingContent.location}</p>
          </div>
        </section>

        <section id="story" className={styles.story} aria-labelledby="field-story-title">
          <div className={styles.storyTitle}>
            <p className={styles.sectionNumber}>01 · The two of us</p>
            <h2 id="field-story-title">It started with a storm.</h2>
          </div>
          <blockquote>
            “The rain stopped.
            <br />
            The conversation didn’t.”
          </blockquote>
          <div className={styles.storyBody}>
            {weddingContent.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section id="weekend" className={styles.weekend} aria-labelledby="field-weekend-title">
          <div className={styles.weekendHeader}>
            <p className={styles.sectionNumber}>02 · The plan</p>
            <h2 id="field-weekend-title">Come early. Stay late.</h2>
            <p>Dress for the garden, bring your dancing shoes, and leave the rest to us.</p>
          </div>
          <ol className={styles.schedule}>
            {weddingContent.schedule.map((item, index) => (
              <li key={item.time}>
                <span className={styles.scheduleIndex}>{index + 1}</span>
                <time>{item.time}</time>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="travel" className={styles.travel} aria-labelledby="field-travel-title">
          <div className={styles.travelPhoto}>
            <ManagedImage
              assetId="stock-wedding-path"
              variantId="gallerySquare"
              sizes="(max-width: 52rem) 82vw, 38vw"
              className={styles.travelImage}
            />
            <span aria-hidden="true">See you there!</span>
          </div>
          <div className={styles.travelCopy}>
            <p className={styles.sectionNumber}>03 · Getting there</p>
            <h2 id="field-travel-title">Your weekend field guide.</h2>
            <div className={styles.travelList}>
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

        <section id="rsvp" className={styles.rsvp} aria-labelledby="field-rsvp-title">
          <span className={styles.rsvpPetalOne} aria-hidden="true" />
          <span className={styles.rsvpPetalTwo} aria-hidden="true" />
          <p>One last thing</p>
          <h2 id="field-rsvp-title">Save us a dance?</h2>
          <p>Please reply by {weddingContent.rsvpDeadline}.</p>
          <a href="mailto:maya-and-julian@example.com?subject=Wedding%20RSVP">Count me in</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>{weddingContent.couple}</p>
        <p>{weddingContent.date}</p>
        <p>Made with a lot of love and a little confetti.</p>
      </footer>
    </div>
  );
}
