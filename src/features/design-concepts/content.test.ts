import { describe, expect, it } from "vitest";
import { weddingContent } from "./content";

describe("weddingContent", () => {
  it("provides a complete shared event fixture for every design concept", () => {
    expect(weddingContent.couple).toBe("Maya Chen & Julian Brooks");
    expect(weddingContent.story).toHaveLength(2);
    expect(weddingContent.schedule).toHaveLength(4);
    expect(weddingContent.travel).toHaveLength(3);
    expect(weddingContent.rsvpDeadline).toBeTruthy();
  });
});
