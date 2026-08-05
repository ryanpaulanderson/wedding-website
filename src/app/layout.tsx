import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { isSitePasswordGateEnabled } from "@/lib/site-access";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export function generateMetadata(): Metadata {
  const isPrivate = isSitePasswordGateEnabled();

  return {
    title: {
      default: "Caroline & Ryan — March 13, 2027",
      template: "%s | Caroline & Ryan",
    },
    description:
      "Caroline and Ryan are getting married on March 13, 2027 at District Winery in Washington, DC.",
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
    <html lang="en" className={`${cormorant.variable} ${spaceGrotesk.variable}`}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
