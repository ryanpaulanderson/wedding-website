import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import type { DeclineFormState } from "@/features/early-declines/validation";
const { submit } = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock("./actions", () => ({ submitEarlyDecline: submit }));
import { DeclineForm } from "./DeclineForm";
beforeEach(() => {
  submit.mockReset();
});
it("preserves fields and announces server validation errors", async () => {
  submit.mockResolvedValue({
    status: "error",
    values: { names: "Household Test", email: "guest@example.com" },
    errors: { email: "Please enter a valid email address." },
  });
  const user = userEvent.setup();
  render(<DeclineForm />);
  await user.type(screen.getByLabelText("Name(s) unable to attend (required)"), "Household Test");
  await user.type(screen.getByLabelText("Email address (required)"), "guest@example.com");
  await user.click(screen.getByRole("button", { name: "Let us know" }));
  expect(await screen.findByRole("alert")).toHaveFocus();
  expect(screen.getByLabelText("Email address (required)")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Name(s) unable to attend (required)")).toHaveValue(
    "Household Test",
  );
});
it("disables sending while pending and focuses the confirmation", async () => {
  let complete: ((value: DeclineFormState) => void) | undefined;
  submit.mockImplementation(
    () =>
      new Promise<DeclineFormState>((resolve) => {
        complete = resolve;
      }),
  );
  const user = userEvent.setup();
  render(<DeclineForm />);
  await user.type(screen.getByLabelText("Name(s) unable to attend (required)"), "Household Test");
  await user.type(screen.getByLabelText("Email address (required)"), "guest@example.com");
  await user.click(screen.getByRole("button", { name: "Let us know" }));
  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await act(async () => complete?.({ status: "success", values: { names: "", email: "" } }));
  expect(await screen.findByRole("status")).toHaveFocus();
  expect(screen.getByRole("link", { name: "ryan@ryanpaulanderson.com" })).toHaveAttribute(
    "href",
    "mailto:ryan@ryanpaulanderson.com",
  );
});
