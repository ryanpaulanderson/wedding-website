import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";

vi.mock("@/components/ui/ManagedImage", () => ({
  ManagedImage: () => <div />,
}));

describe("HomePage", () => {
  it("presents the real wedding essentials and forthcoming details", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Caroline & Ryan" })).toBeInTheDocument();
    expect(screen.getAllByText("Saturday, March 13, 2027")).not.toHaveLength(0);
    expect(screen.getAllByRole("heading", { level: 3, name: "District Winery" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Visit the venue website/ })).toHaveAttribute(
      "href",
      "https://www.districtwinery.com/dc-wedding-venue/",
    );
    expect(screen.getByText(/Schedule, travel, and dress code details/)).toBeInTheDocument();
    expect(screen.getAllByText("RSVP opens soon")).not.toHaveLength(0);
  });

  it("provides home and in-page navigation", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Caroline and Ryan home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("navigation", { name: "Wedding navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "The place" })).toHaveAttribute("href", "#place");
    expect(screen.getByRole("link", { name: "Our story" })).toHaveAttribute("href", "#story");
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("href", "#details");
    expect(screen.getByRole("link", { name: "RSVP" })).toHaveAttribute("href", "#rsvp");
  });
});
