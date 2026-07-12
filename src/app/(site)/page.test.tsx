import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("@/components/ui/ManagedImage", () => ({
  ManagedImage: () => <div />,
}));

describe("Page", () => {
  it("presents all three wedding homepage concepts", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Choose a direction." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /The New Classic/ })).toHaveAttribute(
      "href",
      "/concepts/new-classic",
    );
    expect(screen.getByRole("link", { name: /Field Notes/ })).toHaveAttribute(
      "href",
      "/concepts/field-notes",
    );
    expect(screen.getByRole("link", { name: /After Dark/ })).toHaveAttribute(
      "href",
      "/concepts/after-dark",
    );
  });
});
