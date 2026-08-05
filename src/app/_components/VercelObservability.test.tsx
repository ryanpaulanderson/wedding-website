import { afterEach, describe, expect, it } from "vitest";
import { filterDoNotTrack, isDoNotTrackEnabled } from "./VercelObservability";

function setDoNotTrack(value: string | null): void {
  Object.defineProperty(navigator, "doNotTrack", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setDoNotTrack(null);
});

describe("isDoNotTrackEnabled", () => {
  it.each(["1", "yes"])("recognizes the %s browser opt-out value", (value) => {
    setDoNotTrack(value);

    expect(isDoNotTrackEnabled()).toBe(true);
  });

  it.each(["0", null])("allows telemetry when the browser has not opted out", (value) => {
    setDoNotTrack(value);

    expect(isDoNotTrackEnabled()).toBe(false);
  });
});

describe("filterDoNotTrack", () => {
  it("cancels Vercel telemetry when Do Not Track is enabled", () => {
    setDoNotTrack("1");

    expect(filterDoNotTrack({ type: "pageview", url: "/" })).toBeNull();
  });

  it("preserves Vercel telemetry when Do Not Track is not enabled", () => {
    setDoNotTrack(null);
    const event = { type: "pageview", url: "/" };

    expect(filterDoNotTrack(event)).toBe(event);
  });
});
