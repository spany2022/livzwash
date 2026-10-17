import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { brand } from "@/config/business";
import { LoginForm } from "@/components/admin/LoginForm";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const metadata: Metadata = { title: `Admin sign in · ${brand.name}` };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  await connection();
  const { error } = await searchParams;
  const notAuthorized = error === "not_authorized";

  let signedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
    // Already signed in as an admin → go straight to the dashboard.
    if (signedIn && !notAuthorized) redirect("/admin");
  }

  return (
    <main className="paper-bg flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/85 p-7 shadow-xl ring-1 ring-black/5">
        <p className="text-sm font-semibold text-muted">{brand.name}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-ink">Admin sign in</h1>
        <div className="mt-6">
          {!isSupabaseConfigured() ? (
            <p role="alert" className="text-sm text-red-800">
              Supabase is not configured. Add the environment variables from .env.example.
            </p>
          ) : notAuthorized && signedIn ? (
            <div className="flex flex-col gap-4">
              <p role="alert" className="text-sm text-red-800">
                This account isn&apos;t an admin for this business. Ask the owner to add you.
              </p>
              <form action={signOut}>
                <button type="submit" className="min-h-11 w-full rounded-full bg-ink font-semibold text-white">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <LoginForm />
          )}
        </div>
      </div>
    </main>
  );
}
