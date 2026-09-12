"use server";
import { headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { validateDecline, type DeclineFormState } from "@/features/early-declines/validation";
import { saveEarlyDecline } from "@/features/early-declines/submission";
import { deliverEarlyDecline } from "@/features/early-declines/delivery";

export async function submitEarlyDecline(
  _previous: DeclineFormState,
  formData: FormData,
): Promise<DeclineFormState> {
  const parsed = validateDecline({ names: formData.get("names"), email: formData.get("email") });
  if (parsed.status === "error") return parsed;
  const result = await saveEarlyDecline(parsed.values, await headers());
  if (result.status === "unavailable" || result.status === "limited")
    return {
      status: "error",
      values: parsed.values,
      message:
        result.status === "limited"
          ? "Too many attempts. Please try again in an hour, or email Ryan at ryan@ryanpaulanderson.com."
          : "We couldn’t save your notice. Please try again, or email Ryan at ryan@ryanpaulanderson.com.",
    };
  if (result.status === "saved") {
    after(async () => {
      await deliverEarlyDecline(result.id);
    });
    revalidatePath("/admin/early-declines");
  }
  return { status: "success", values: { names: "", email: "" } };
}
