import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { DeclineForm } from "./DeclineForm";
import styles from "./DeclineForm.module.css";
export const metadata: Metadata = {
  title: "Unable to attend",
  description: "Let Caroline and Ryan know if you already know you cannot attend.",
  robots: { index: false, follow: false },
};
export const maxDuration = 120;
export default function UnableToAttendPage() {
  return (
    <div className={styles.backdrop}>
      <div className={styles.decoration} aria-hidden="true">
        <Image
          src="/brand/wedding-tree-logo.webp"
          alt=""
          width={900}
          height={900}
          sizes="(max-width: 47rem) 28rem, (max-width: 93rem) 60vw, 56rem"
          className={styles.tree}
        />
      </div>
      <main className={styles.page}>
        <Link href="/">Caroline &amp; Ryan · Back to our wedding</Link>
        <p className={styles.eyebrow}>Looking ahead</p>
        <h1>Already know you can’t make it?</h1>
        <p>
          No RSVP is needed yet—formal invitations will follow. If you already know you’re unable to
          attend, you can let us know here to help us plan our guest list.
        </p>
        <p>
          We’ll miss celebrating with you. Please include the names of everyone who won’t be able to
          join us.
        </p>
        <DeclineForm />
      </main>
    </div>
  );
}
