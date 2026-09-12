import Image from "next/image";
import Link from "next/link";
import { ManagedImage } from "@/components/ui/ManagedImage";
import { NavyYardMap } from "./_components/NavyYardMap";
import styles from "./page.module.css";

const detailCards = [
  {
    label: "Date",
    title: "Saturday, March 13, 2027",
    description: "An evening celebration in Washington, DC.",
  },
  {
    label: "Venue",
    title: "District Winery",
    description: "385 Water Street SE · Navy Yard · Washington, DC",
  },
  {
    label: "Schedule",
    title: "Forthcoming",
    description: "Timing and day-of details will be shared with the formal invitation.",
  },
  {
    label: "RSVP",
    title: "Opens with the invitation",
    description: "Reply instructions will be included with the formal invitation.",
  },
] as const;

function StoryCanopy() {
  return (
    <div className={`${styles.storyCanopyFrame} ${styles.storyCanopyTopFrame}`} aria-hidden="true">
      <Image
        src="/brand/riverlight-canopy-top-left-v2.webp"
        alt=""
        width={1254}
        height={1254}
        sizes="(max-width: 38rem) 17rem, (max-width: 72rem) 24rem, 30rem"
        className={styles.storyCanopyBranch}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Caroline and Ryan home">
          C<span aria-hidden="true">/</span>R
        </Link>
        <nav aria-label="Wedding navigation">
          <a href="#place">The place</a>
          <a href="#story">Our story</a>
          <a href="#details">Details</a>
          <a href="#hotels">Hotels</a>
          <a href="#rsvp">RSVP</a>
        </nav>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Save the date</p>
            <Image
              src="/brand/wedding-tree-logo.webp"
              alt=""
              width={900}
              height={900}
              sizes="(max-width: 38rem) 15rem, (max-width: 52rem) 18rem, 22rem"
              className={styles.heroMark}
            />
            <h1 id="home-title" aria-label="Caroline & Ryan">
              <span>Caroline</span>
              <span>
                <span className={styles.heroAmpersand}>&amp;</span> Ryan
              </span>
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
            <figcaption>Washington, DC · Sunset over the city</figcaption>
          </figure>
        </section>

        <section id="place" className={styles.place} aria-labelledby="place-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>The venue</p>
            <h2 id="place-title">Meet us at District Winery.</h2>
            <p>We’ll celebrate on the Anacostia waterfront in Washington, DC.</p>
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
            <StoryCanopy />
            <div className={styles.storyCopy}>
              <p className={styles.sectionLabel}>Our story</p>
              <h2 id="story-title">The tree that became our mark.</h2>
              <p>
                We got engaged in the Alhambra gardens in Granada. The tree from that day inspired
                the mark you’ll see throughout our wedding.
              </p>
            </div>
          </div>

          <div className={styles.storyGrid}>
            <figure className={styles.storyWideFigure}>
              <ManagedImage
                assetId="alhambra-garden-portrait"
                variantId="storyWide"
                sizes="(max-width: 52rem) 100vw, 62vw"
                className={styles.storyImage}
              />
              <figcaption>Alhambra gardens · Granada</figcaption>
            </figure>

            <figure className={styles.storyPortraitFigure}>
              <ManagedImage
                assetId="granada-proposal-ring"
                variantId="storyPortrait"
                sizes="(max-width: 52rem) 78vw, 26vw"
                className={styles.storyImage}
              />
              <figcaption>Engaged in Granada</figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.gallery} aria-labelledby="gallery-title">
          <div className={styles.galleryHeader}>
            <p className={styles.sectionLabel}>A few favorites</p>
            <h2 id="gallery-title">Together, near and far.</h2>
          </div>

          <div className={styles.galleryGrid}>
            <figure className={styles.receptionFigure}>
              <ManagedImage
                assetId="reception-formal-portrait"
                variantId="storyPortrait"
                sizes="(max-width: 48rem) 88vw, 28vw"
                className={styles.galleryImage}
              />
            </figure>

            <figure className={styles.oceanFigure}>
              <ManagedImage
                assetId="oceanfront-portrait"
                variantId="storyWide"
                sizes="(max-width: 48rem) 100vw, 58vw"
                className={styles.galleryImage}
              />
            </figure>

            <figure className={styles.goldenGateFigure}>
              <ManagedImage
                assetId="golden-gate-formal"
                variantId="storyPortrait"
                sizes="(max-width: 48rem) 88vw, 29vw"
                className={styles.galleryImage}
              />
            </figure>
          </div>
        </section>

        <section id="details" className={styles.details} aria-labelledby="details-title">
          <div className={styles.detailsTop}>
            <div className={styles.detailsHeader}>
              <p className={styles.sectionLabel}>What we know</p>
              <h2 id="details-title">The details so far.</h2>
              <p>
                We’ll share the schedule, dress code, and RSVP details with the formal invitation.
              </p>
            </div>
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

        <section id="hotels" className={styles.hotels} aria-labelledby="hotels-title">
          <div className={styles.hotelIntro}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionLabel}>Stay nearby</p>
              <h2 id="hotels-title">Hotel blocks.</h2>
              <p>
                We’ve arranged room blocks in Navy Yard for Thursday, March 11 through Monday, March
                15, 2027. All three hotels are within walking distance of our welcome reception at
                Solace Outpost Navy Yard and our wedding at District Winery.
              </p>
              <p>Book using the links below by February 11, 2027.</p>
            </div>
            <NavyYardMap />
          </div>

          <div className={styles.hotelGrid}>
            <article>
              <p className={styles.sectionLabel}>Marriott Bonvoy</p>
              <h3>Residence Inn by Marriott Washington DC – Navy Yard</h3>
              <a href="https://app.marriott.com/reslink?id=1779114882941&key=GRP&app=resvlink">
                Book the Residence Inn wedding block <span aria-hidden="true">↗</span>
              </a>
            </article>
            <article>
              <p className={styles.sectionLabel}>Hilton</p>
              <h3>Hampton Inn &amp; Suites Washington DC – Navy Yard</h3>
              <p>
                The booking link defaults to March 11–14. Adjust your dates if you plan to stay
                through March 15.
              </p>
              <a href="https://www.hilton.com/en/book/reservation/deeplink/?ctyhocn=WASNYHX&groupCode=CHH912&arrivaldate=2027-03-11&departuredate=2027-03-14&cid=OM,WW,HILTONLINK,EN,DirectLink&fromId=HILTONLINKDIRECT">
                Book the Hampton Inn wedding block <span aria-hidden="true">↗</span>
              </a>
            </article>
            <article>
              <p className={styles.sectionLabel}>World of Hyatt</p>
              <h3>Thompson Washington D.C.</h3>
              <a href="https://www.hyatt.com/thompson-hotels/iadth-thompson-washington-dc?corp_id=85917">
                Book the Thompson wedding block <span aria-hidden="true">↗</span>
              </a>
            </article>
          </div>
        </section>

        <section id="rsvp" className={styles.rsvp} aria-labelledby="rsvp-title">
          <div className={styles.rsvpMarkPanel} aria-hidden="true">
            <Image
              src="/brand/wedding-tree-logo.webp"
              alt=""
              width={900}
              height={900}
              sizes="(max-width: 38rem) 15rem, (max-width: 52rem) 19rem, 24rem"
              className={styles.rsvpMark}
            />
          </div>
          <div className={styles.rsvpContent}>
            <p>Formal invitation to follow</p>
            <h2 id="rsvp-title">We can’t wait to celebrate with you.</h2>
            <p className={styles.rsvpStatus}>RSVP opens with the invitation</p>
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
