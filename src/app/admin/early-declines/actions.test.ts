import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  review: vi.fn(),
  deliver: vi.fn(),
  revalidate: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));
vi.mock("@/lib/admin-access", () => ({ requireAdminSession: mocks.authorize }));
vi.mock("@/features/early-declines/admin", () => ({ setDeclineReviewed: mocks.review }));
vi.mock("@/features/early-declines/delivery", () => ({ deliverEarlyDeclineEmail: mocks.deliver }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { reviewDecline, retryDeclineEmail } from "./actions";
const id = "10000000-0000-4000-8000-000000000001";
function form(page = "3") {
  const data = new FormData();
  data.set("id", id);
  data.set("reviewed", "yes");
  data.set("page", page);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue(undefined);
  mocks.review.mockResolvedValue(true);
  mocks.deliver.mockResolvedValue(undefined);
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`redirect:${url}`);
  });
});
describe("early notice admin pagination", () => {
  it.each(["yes", "no"])(
    "stays on the same page after changing review state to %s",
    async (reviewed) => {
      const data = form();
      data.set("reviewed", reviewed);
      await expect(reviewDecline(data)).rejects.toThrow(
        "redirect:/admin/early-declines?page=3&result=reviewed",
      );
      expect(mocks.review).toHaveBeenCalledWith(id, reviewed === "yes");
    },
  );
  it("keeps the page when the review change fails", async () => {
    mocks.review.mockResolvedValue(false);
    await expect(reviewDecline(form())).rejects.toThrow(
      "redirect:/admin/early-declines?page=3&result=error",
    );
  });
  it("stays on the same page after an email retry", async () => {
    await expect(retryDeclineEmail(form())).rejects.toThrow(
      "redirect:/admin/early-declines?page=3&result=retried",
    );
    expect(mocks.deliver).toHaveBeenCalledWith(id);
  });
  it("keeps the page when email delivery throws", async () => {
    mocks.deliver.mockRejectedValue(new Error("delivery failed"));
    await expect(retryDeclineEmail(form())).rejects.toThrow(
      "redirect:/admin/early-declines?page=3&result=error",
    );
  });
  it("keeps the page for an invalid email job ID without sending", async () => {
    const data = form();
    data.set("id", "invalid");
    await expect(retryDeclineEmail(data)).rejects.toThrow(
      "redirect:/admin/early-declines?page=3&result=error",
    );
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it.each(["", "0", "-2", "2.5", "1000000", "2&result=reviewed", "https://example.com"])(
    "defaults invalid page %s to page 1",
    async (page) => {
      await expect(reviewDecline(form(page))).rejects.toThrow(
        "redirect:/admin/early-declines?page=1&result=reviewed",
      );
      await expect(retryDeclineEmail(form(page))).rejects.toThrow(
        "redirect:/admin/early-declines?page=1&result=retried",
      );
    },
  );
  it("defaults a missing page to page 1", async () => {
    const data = form();
    data.delete("page");
    await expect(reviewDecline(data)).rejects.toThrow(
      "redirect:/admin/early-declines?page=1&result=reviewed",
    );
  });
  it("authorizes before either action can mutate or redirect", async () => {
    mocks.authorize.mockRejectedValue(new Error("Admin access required."));
    await expect(reviewDecline(form())).rejects.toThrow("Admin access required.");
    await expect(retryDeclineEmail(form())).rejects.toThrow("Admin access required.");
    expect(mocks.review).not.toHaveBeenCalled();
    expect(mocks.deliver).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
