import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "./NavyYardMap.module.css";

// Coordinates share the SVG's geographic bounds; see public/maps/README.md.
const places = [
  { name: "Residence Inn", address: "1233 First Street SE", left: 32.755, top: 17.451 },
  { name: "Hampton Inn & Suites", address: "1265 First Street SE", left: 33.674, top: 29.059 },
  { name: "Thompson", address: "221 Tingey Street SE", left: 65.803, top: 32.971 },
  { name: "District Winery", address: "385 Water Street SE", left: 80.903, top: 49.101 },
  { name: "Solace Outpost", address: "71 Potomac Avenue SE", left: 26.642, top: 89.4 },
] as const;

type PinStyle = CSSProperties & { "--pin-left": string; "--pin-top": string };

export function NavyYardMap() {
  return (
    <figure className={styles.map} aria-labelledby="navy-yard-map-caption">
      <div className={styles.drawing}>
        <Image
          src="/maps/navy-yard.svg"
          alt="Navy Yard streets around Nationals Park and the Anacostia River."
          width={640}
          height={520}
        />
        {places.map((place, index) => {
          const pinStyle: PinStyle = {
            "--pin-left": `${place.left}%`,
            "--pin-top": `${place.top}%`,
          };
          return (
            <a
              key={place.name}
              className={styles.pin}
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.name}, ${place.address}, Washington DC`)}`}
              aria-label={`Directions to ${place.name}`}
              style={pinStyle}
            >
              <span>{index + 1}</span>
            </a>
          );
        })}
      </div>
      <figcaption className={styles.caption}>
        <span id="navy-yard-map-caption" className={styles.title}>
          Around Navy Yard
        </span>
        <span>Select a pin for directions.</span>
        <ol className={styles.legend}>
          {places.map((place) => (
            <li key={place.name}>{place.name}</li>
          ))}
        </ol>
        <a className={styles.attribution} href="https://www.openstreetmap.org/copyright">
          Map data © OpenStreetMap contributors
        </a>
      </figcaption>
    </figure>
  );
}
