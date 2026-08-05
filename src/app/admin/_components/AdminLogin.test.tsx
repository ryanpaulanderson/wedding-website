import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminLogin } from "./AdminLogin";

vi.mock("../actions", () => ({ signInToAdmin: vi.fn() }));

describe("AdminLogin", () => {
  it("renders a labeled progressive sign-in form", () => {
    render(<AdminLogin hasPasswordError={false} isUnavailable={false} />);

    expect(screen.getByRole("heading", { level: 1, name: "Admin portal" })).toBeVisible();
    expect(screen.getByLabelText("Admin passphrase")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute("type", "submit");
    expect(screen.getByText(/separate from the private-preview password/i)).toBeVisible();
  });

  it("uses generic credential errors and associates them with the field", () => {
    render(<AdminLogin hasPasswordError isUnavailable={false} />);

    const password = screen.getByLabelText("Admin passphrase");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-describedby", "admin-password-error");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to sign in with those credentials.",
    );
  });

  it("fails closed without rendering a password form when configuration is unavailable", () => {
    render(<AdminLogin hasPasswordError={false} isUnavailable />);

    expect(screen.getByRole("alert")).toHaveTextContent("Admin access is unavailable.");
    expect(screen.queryByLabelText("Admin passphrase")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });
});
