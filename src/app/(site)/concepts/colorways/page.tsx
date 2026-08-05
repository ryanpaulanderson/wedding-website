import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Colorways | Caroline & Ryan",
  robots: {
    index: false,
    follow: false,
  },
};

const colorways = [
  {
    key: "indigoApricot",
    name: "Indigo & apricot",
    mood: "Cool, editorial, and sunset-warmed",
    description:
      "A calm blue foundation keeps the waterfront feeling present, while apricot picks up the warmth in the photographs without reading as gold.",
    deep: "#234052",
    accent: "#e69b73",
    soft: "#dce9e9",
    warm: "#f2ede4",
  },
  {
    key: "forestBlush",
    name: "Forest & blush",
    mood: "Botanical, soft, and romantic",
    description:
      "The most natural fit for the tree mark: a grounded green paired with a dusty rose that feels celebratory without leaning into red.",
    deep: "#29463a",
    accent: "#e3a8a1",
    soft: "#dce4d8",
    warm: "#f4efe6",
  },
  {
    key: "petrolCoral",
    name: "Petrol & coral",
    mood: "Waterfront, bright, and a little unexpected",
    description:
      "A deeper blue-green makes the palette feel specific to the river, with coral bringing in the energy of a city sunset.",
    deep: "#174d57",
    accent: "#e47e6e",
    soft: "#d7e5e4",
    warm: "#f3eee4",
  },
] as const;

export default function ColorwaysPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} href="/">
          ← Back to the site
        </Link>
        <p className={styles.eyebrow}>Color exploration</p>
        <h1>Three ways to move past maroon and gold.</h1>
        <p className={styles.intro}>
          These keep the same expressive layout and photography, but replace the two strongest
          accent colors with pairings that feel less like team colors and more like your story.
        </p>
      </header>

      <section className={styles.grid} aria-label="Colorway options">
        {colorways.map((colorway) => (
          <article key={colorway.key} className={`${styles.card} ${styles[colorway.key]}`}>
            <div className={styles.cardHeader}>
              <p className={styles.optionLabel}>Option {colorways.indexOf(colorway) + 1}</p>
              <h2>{colorway.name}</h2>
              <p>{colorway.mood}</p>
            </div>

            <div className={styles.swatches} aria-label={`${colorway.name} color swatches`}>
              <div className={styles.swatch}>
                <span>Deep</span>
                <code>{colorway.deep}</code>
              </div>
              <div className={`${styles.swatch} ${styles.accentSwatch}`}>
                <span>Accent</span>
                <code>{colorway.accent}</code>
              </div>
              <div className={`${styles.swatch} ${styles.softSwatch}`}>
                <span>Soft</span>
                <code>{colorway.soft}</code>
              </div>
              <div className={`${styles.swatch} ${styles.warmSwatch}`}>
                <span>Warm</span>
                <code>{colorway.warm}</code>
              </div>
            </div>

            <div className={styles.miniSite} aria-label={`${colorway.name} site preview`}>
              <div className={styles.miniHeader}>
                <span className={styles.miniWordmark}>C / R</span>
                <span className={styles.miniNav}>THE PLACE &nbsp; OUR STORY &nbsp; RSVP</span>
              </div>
              <div className={styles.miniHero}>
                <span className={styles.miniEyebrow}>Save the date</span>
                <p className={styles.miniNames}>
                  Caroline <em>&amp;</em> Ryan
                </p>
                <span className={styles.miniRule} />
                <span className={styles.miniDate}>MARCH 13, 2027 · WASHINGTON, DC</span>
              </div>
              <div className={styles.miniVenue}>
                <span>District Winery</span>
                <span className={styles.miniVenueAccent}>The venue</span>
              </div>
              <div className={styles.miniDetails}>
                <span>THE DETAILS SO FAR</span>
                <span>Celebrate with us.</span>
              </div>
            </div>

            <p className={styles.description}>{colorway.description}</p>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <p>
          Current site: <span>indigo #234052</span> + <span>apricot #e69b73</span>
        </p>
        <p>Pick the direction that feels most like you, then I can apply it site-wide.</p>
      </footer>
    </main>
  );
}
