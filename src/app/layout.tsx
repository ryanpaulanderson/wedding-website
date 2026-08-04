import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Fraunces, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { isSitePasswordGateEnabled } from "@/lib/site-access";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export function generateMetadata(): Metadata {
  const isPrivate = isSitePasswordGateEnabled();

  return {
    title: {
      default: "Wedding Design Concepts",
      template: "%s | Wedding Design Concepts",
    },
    description: "Four modern front-page directions for a wedding website.",
    robots: isPrivate
      ? {
          follow: false,
          index: false,
          nocache: true,
        }
      : undefined,
  };
}

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${cormorant.variable} ${fraunces.variable} ${spaceGrotesk.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
