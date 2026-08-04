import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ManagedImage } from "@/components/ui/ManagedImage";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Choose a direction",
  description: "Compare four complete visual directions for the wedding homepage.",
};

export default function Page() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Caroline & Ryan · Design study</p>
        <p className={styles.issue}>Issue 01 / 2026</p>
      </header>

      <main id="main-content" className={styles.main}>
        <section className={styles.intro} aria-labelledby="page-title">
          <p className={styles.eyebrow}>Four ways to say “we’re getting married”</p>
          <h1 id="page-title">Choose a direction.</h1>
          <p className={styles.lede}>
            Four distinct modern design languages—now including one grounded in the real place,
            photographs, and story. Open each concept to experience the complete page.
          </p>
        </section>

        <ol className={styles.conceptGrid} aria-label="Wedding homepage concepts">
          <li className={`${styles.concept} ${styles.classic}`}>
            <Link href="/concepts/new-classic" className={styles.conceptLink}>
              <div className={styles.preview}>
                <ManagedImage
                  assetId="stock-wedding-path"
                  variantId="storyPortrait"
                  sizes="(max-width: 42rem) 88vw, (max-width: 75rem) 44vw, 22vw"
                  className={styles.previewImage}
                />
                <span className={styles.classicMonogram} aria-hidden="true">
                  M/J
                </span>
              </div>
              <div className={styles.conceptCopy}>
                <span className={styles.number}>01</span>
                <h2>The New Classic</h2>
                <p>Editorial restraint, heirloom typography, and quietly confident romance.</p>
                <span className={styles.openLabel}>Open concept</span>
              </div>
            </Link>
          </li>

          <li className={`${styles.concept} ${styles.fieldNotes}`}>
            <Link href="/concepts/field-notes" className={styles.conceptLink}>
              <div className={styles.preview}>
                <span className={styles.sun} aria-hidden="true" />
                <ManagedImage
                  assetId="stock-wedding-outdoors"
                  variantId="storyWide"
                  sizes="(max-width: 42rem) 88vw, (max-width: 75rem) 44vw, 22vw"
                  className={styles.previewImage}
                />
                <span className={styles.fieldDate} aria-hidden="true">
                  09 · 20
                </span>
              </div>
              <div className={styles.conceptCopy}>
                <span className={styles.number}>02</span>
                <h2>Field Notes</h2>
                <p>Optimistic color, organic shapes, and the spirit of a garden weekend.</p>
                <span className={styles.openLabel}>Open concept</span>
              </div>
            </Link>
          </li>

          <li className={`${styles.concept} ${styles.afterDark}`}>
            <Link href="/concepts/after-dark" className={styles.conceptLink}>
              <div className={styles.preview}>
                <ManagedImage
                  assetId="stock-wedding-outdoors"
                  variantId="homeHero"
                  sizes="(max-width: 42rem) 88vw, (max-width: 75rem) 44vw, 22vw"
                  className={styles.previewImage}
                />
                <span className={styles.darkTitle} aria-hidden="true">
                  After
                  <br />
                  Dark
                </span>
              </div>
              <div className={styles.conceptCopy}>
                <span className={styles.number}>03</span>
                <h2>After Dark</h2>
                <p>Cinematic imagery, luminous details, and an architectural evening mood.</p>
                <span className={styles.openLabel}>Open concept</span>
              </div>
            </Link>
          </li>

          <li className={`${styles.concept} ${styles.riverlight}`}>
            <Link href="/concepts/riverlight" className={styles.conceptLink}>
              <div className={styles.preview}>
                <ManagedImage
                  assetId="dc-rooftop-sunset"
                  variantId="conceptPreview"
                  sizes="(max-width: 42rem) 88vw, (max-width: 75rem) 44vw, 22vw"
                  className={styles.previewImage}
                />
                <Image
                  src="/brand/wedding-tree-logo-riverlight.webp"
                  alt=""
                  width={900}
                  height={900}
                  sizes="(max-width: 42rem) 8rem, 6rem"
                  className={styles.riverlightMark}
                />
                <span className={styles.riverlightDate} aria-hidden="true">
                  03 · 13 · 27
                </span>
              </div>
              <div className={styles.conceptCopy}>
                <span className={styles.number}>04</span>
                <h2>Riverlight</h2>
                <p>Waterfront light, modern structure, and the warm tones of an urban winery.</p>
                <span className={styles.openLabel}>Open concept</span>
              </div>
            </Link>
          </li>
        </ol>
      </main>

      <footer className={styles.footer}>
        <p>Front-page explorations · Four visual directions</p>
      </footer>
    </div>
  );
}
