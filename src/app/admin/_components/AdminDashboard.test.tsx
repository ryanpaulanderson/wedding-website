import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./AdminDashboard";

vi.mock("../actions", () => ({ signOutOfAdmin: vi.fn() }));

describe("AdminDashboard", () => {
  it("presents an honest disconnected-data state without fake controls", () => {
    render(<AdminDashboard snapshot={{ status: "not-connected" }} />);

    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    expect(screen.getByText("Database not connected")).toBeVisible();
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getAllByText("Awaiting data source")).toHaveLength(5);
    expect(screen.getByRole("heading", { name: "No responses to show" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveAttribute("type", "submit");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("renders the narrow ready-state DTO without exposing a database record", () => {
    render(
      <AdminDashboard
        snapshot={{
          status: "ready",
          totals: {
            attendingGuests: 42,
            households: 24,
            invitedGuests: 56,
            responsesReceived: 18,
          },
          recentResponses: [
            {
              attendance: "mixed",
              guestCount: 3,
              householdId: "household-1",
              householdName: "The Example household",
              submittedAt: "2026-08-05T14:00:00.000Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Database connected")).toBeVisible();
    expect(screen.getByText("The Example household")).toBeVisible();
    expect(screen.getByText("42")).toBeVisible();
  });
});
