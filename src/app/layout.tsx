import type { Metadata } from "next";
import type { ReactNode } from "react";
import { isSitePasswordGateEnabled } from "@/lib/site-access";
import "./globals.css";

export function generateMetadata(): Metadata {
  const isPrivate = isSitePasswordGateEnabled();

  return {
    title: {
      default: "Wedding Website",
      template: "%s | Wedding Website",
    },
    description: "A foundation for the wedding website.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
