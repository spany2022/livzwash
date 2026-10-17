"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/admin/actions";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, { error: initialError });
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-ink">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="min-h-12 rounded-xl bg-white px-4 ring-1 ring-black/15 focus:ring-2 focus:ring-brand focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-ink">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 rounded-xl bg-white px-4 ring-1 ring-black/15 focus:ring-2 focus:ring-brand focus:outline-none"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-800">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-brand font-semibold text-on-brand disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
