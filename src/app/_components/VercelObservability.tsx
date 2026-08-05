"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export function isDoNotTrackEnabled(): boolean {
  return navigator.doNotTrack === "1" || navigator.doNotTrack === "yes";
}

export function filterDoNotTrack<T>(event: T): T | null {
  return isDoNotTrackEnabled() ? null : event;
}

export function VercelObservability() {
  return (
    <>
      <Analytics beforeSend={filterDoNotTrack} />
      <SpeedInsights beforeSend={filterDoNotTrack} />
    </>
  );
}
