"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { limits } from "@/config/limits";
import { BRANCH_COOKIE, requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeText } from "@/lib/validation/text";
import { FEEDBACK_STATUSES } from "@/types/feedback";
import { AIError } from "@/lib/ai/gemini";
import { generateWeeklySummary } from "@/lib/insights/weeklySummary";
import { isWeekStart } from "@/lib/time";

export interface FormState {
  error?: string;
  success?: string;
}

const loginSchema = z.object({
  email: z.email({ message: "Enter a valid email address." }).max(200),
  password: z.string().min(1, { message: "Enter your password." }).max(200),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    // Same message for every failure: don't reveal which part was wrong.
    if (error) return { error: "Incorrect email or password." };
  } catch {
    return { error: "Sign-in isn't available right now. Check the Supabase configuration." };
  }
  redirect("/admin");
}

export async function signOut() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore — we redirect to the login page either way.
  }
  redirect("/admin/login");
}

/** Switch the branch the admin is viewing (only to branches they can access). */
export async function switchBranch(formData: FormData) {
  const { branches } = await requireAdmin();
  const slug = formData.get("branch");
  const target = branches.find((b) => b.slug === slug);
  if (target) {
    (await cookies()).set(BRANCH_COOKIE, target.slug, {
      path: "/admin",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  // Stay on the same section, but leave pages that belong to one branch (e.g. a feedback item).
  const section = String(formData.get("returnTo") ?? "").match(/^\/admin(\/(feedback|analytics|insights|qr))?$/);
  redirect(section ? section[0] : "/admin");
}

const updateSchema = z.object({
  id: z.uuid(),
  status: z.enum(FEEDBACK_STATUSES),
  notes: z
    .string()
    .max(limits.adminNotesMaxChars * 2)
    .transform(normalizeText)
    .pipe(z.string().max(limits.adminNotesMaxChars, { message: "Notes are too long." })),
});

export async function updateFeedback(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business } = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  // RLS + column grants: admins can only change these two columns.
  const { data, error } = await supabase
    .from("review_sessions")
    .update({ feedback_status: parsed.data.status, admin_notes: parsed.data.notes || null })
    .eq("id", parsed.data.id)
    .eq("business_id", business.id)
    .select("id");

  if (error || !data?.length) return { error: "Couldn't save changes. Please try again." };
  revalidatePath("/admin/feedback");
  revalidatePath(`/admin/feedback/${parsed.data.id}`);
  return { success: "Saved." };
}

/** Generate or regenerate the AI summary for one week (Insights page). */
export async function generateWeeklySummaryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business, config } = await requireAdmin();
  const week = formData.get("week");
  if (!isWeekStart(week)) return { error: "Invalid week." };

  try {
    // Runs as the signed-in admin, so RLS limits it to their own business.
    const outcome = await generateWeeklySummary({
      db: supabase,
      businessId: business.id,
      config,
      weekStart: week,
      mode: "manual",
    });
    switch (outcome.status) {
      case "saved":
        revalidatePath("/admin/insights");
        revalidatePath("/admin");
        return { success: "Summary updated." };
      case "no_data":
        return { error: "There were no customer visits this week, so there's nothing to summarise." };
      case "future_week":
        return { error: "This week hasn't started yet." };
      case "limit_reached":
        return { error: "You've reached the regenerate limit for this week." };
      default:
        return { error: "Couldn't create the summary." };
    }
  } catch (err) {
    console.error("[insights] summary failed:", err instanceof Error ? err.message : err);
    return {
      error:
        err instanceof AIError
          ? "We couldn't write the summary right now. Please try again in a minute."
          : "Couldn't create the summary. Please try again.",
    };
  }
}
