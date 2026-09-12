"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-access";
import { setDeclineReviewed } from "@/features/early-declines/admin";
import { deliverEarlyDeclineEmail } from "@/features/early-declines/delivery";
import { parseEarlyDeclinePage } from "@/features/early-declines/pagination";

export async function reviewDecline(form: FormData) {
  await requireAdminSession();
  const page = parseEarlyDeclinePage(form.get("page"));
  const id = form.get("id");
  const reviewed = form.get("reviewed");
  const ok =
    typeof id === "string" &&
    (reviewed === "yes" || reviewed === "no") &&
    (await setDeclineReviewed(id, reviewed === "yes"));
  revalidatePath("/admin/early-declines");
  redirect(`/admin/early-declines?page=${page}&result=${ok ? "reviewed" : "error"}`);
}
export async function retryDeclineEmail(form: FormData) {
  await requireAdminSession();
  const page = parseEarlyDeclinePage(form.get("page"));
  const id = form.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
    redirect(`/admin/early-declines?page=${page}&result=error`);
  try {
    await deliverEarlyDeclineEmail(id);
  } catch {
    redirect(`/admin/early-declines?page=${page}&result=error`);
  }
  revalidatePath("/admin/early-declines");
  redirect(`/admin/early-declines?page=${page}&result=retried`);
}
