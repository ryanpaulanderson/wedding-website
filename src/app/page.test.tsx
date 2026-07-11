import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";

describe("Page", () => {
  it("renders the project foundation heading", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Project foundation" }),
    ).toBeInTheDocument();
  });
});
