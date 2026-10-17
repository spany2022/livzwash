# PROMPT A — Configure a copy for a new client (recommended)

Use this inside a COPY of the existing project (made from the GitHub template or a folder copy).
Fill in the CLIENT DETAILS block, then paste the whole prompt into Claude Code.

---

You are Claude Code, working inside a copy of my existing "AI QR Review & Feedback System"
codebase (Next.js App Router + TypeScript + Tailwind + Supabase + Gemini). Configure this copy for
a new client. Work autonomously from start to finish: do not ask me questions. Use sensible
defaults where details are missing and list every default you chose in the final report. Only stop
and tell me when a step needs MY action (creating accounts, pasting keys, running SQL in Supabase,
deploying).

## CLIENT DETAILS (fill in; leave "auto" to let Claude choose)
- Business name: <e.g. Glow Hair Studio>
- Business category (any text): <e.g. salon | spa | gym | dental-clinic | hotel | anything>
- Slug for the QR link: <auto = lowercase-hyphenated business name>
- Tagline (optional): <e.g. Look good. Feel great. | none>
- Logo: <path of a file I put in public/brand/, e.g. public/brand/logo.png | auto = create a simple monogram SVG>
- Primary colour (buttons/stars): <hex | auto = choose a fitting colour for the category>
- Background colour: <hex | auto = a very light tint of the primary colour>
- Google review URL: <https://g.page/r/.../review or https://search.google.com/local/writereview?placeid=... | none>
- "What did you like?" chips (4-5 stars): <comma list | auto>
- "What could be better?" chips (1-3 stars): <comma list | auto>
- Time zone: <Asia/Kolkata>
- Owner admin email: <owner@example.com>
- Offer optional Google link after private feedback (policy-safe mode): <false | true>

## RULES
- Change ONLY client-specific things: `src/config/business.ts`, `public/brand/`, `supabase/create_admin.sql`,
  and `.env.local` (create it only if missing). Do NOT modify shared code in `src/components`, `src/lib`,
  `src/app`, migrations, tests or `vercel.json` unless a check fails because of the configuration.
- `category` stays a plain string. Never add a TypeScript union or industry-specific code.
- Never print, log, commit or expose secret values from `.env.local`.
- Never invent a Google review URL. If none is given, keep `YOUR_GOOGLE_REVIEW_URL`.

## STEPS
1. Inspect the project. Confirm it is the template: `src/config/business.ts`,
   `supabase/migrations/0001_init.sql`, `supabase/migrations/0002_weekly_summaries.sql`,
   `supabase/create_admin.sql`, `docs/client-setup-guide.pdf` exist. Read `AGENTS.md`/`CLAUDE.md` if present.
   If `node_modules` is missing, run `npm install`.
2. Update `src/config/business.ts` with the client details.
   - Slug: lowercase letters/numbers/hyphens only, max 80 chars.
   - If chips are "auto", choose 6 short, neutral, general words that fit the category (no claims like
     "Best staff"). Each list 1-12 items, max 40 chars each, no duplicates.
     Reference sets: salon = Service, Staff, Result, Cleanliness, Ambience, Experience / Service, Staff,
     Result, Waiting Time, Cleanliness, Price. spa = Therapist, Relaxation, Ambience, Cleanliness,
     Hospitality, Value / Therapist, Waiting Time, Cleanliness, Noise, Value, Booking. gym = Trainers,
     Equipment, Cleanliness, Atmosphere, Classes, Value / Equipment, Crowding, Cleanliness, Trainers,
     Staff, Value. dental-clinic = Doctor, Staff, Explanation, Comfort, Cleanliness, Punctuality /
     Waiting Time, Staff, Explanation, Billing, Comfort, Cleanliness.
   - Colours: primary must have contrast >= 4.5:1 against white (compute it and report the ratio);
     background must be light (contrast of muted text #6F6259 on it >= 4.5:1).
3. Logo: if a file was given, point `logo` to it (path starting with `/brand/`). Otherwise create a clean,
   simple monogram SVG (`public/brand/logo.svg`, circle in the primary colour, initials in the background
   colour). Delete the old café logo if it is no longer used.
4. Update `supabase/create_admin.sql`: business name, slug and category in the first insert; the same slug
   in the join; the owner email.
5. `.env.local`: if it does not exist, copy `.env.example` to `.env.local`, leave keys empty, and fill
   `CRON_SECRET` with the output of `openssl rand -hex 32`. If it exists, do not change it.
6. Quality gate: run `npm run check` (lint + typecheck + tests + build). Fix only configuration-caused
   failures. All must pass.
7. Visual check: start the dev server (reuse one already running on port 3000 if present), open
   `/review/<slug>` at 360px and 390px widths and at desktop width. Confirm: logo, name, tagline and
   colours are correct; the 4-5 star chips and 1-3 star chips are the new ones; no horizontal scrolling.
   Do NOT submit test visits if Supabase is configured (avoid polluting the client's data).
8. If `.env.local` already has keys, verify WITHOUT printing secrets: Supabase URL format; anon key is
   role anon and service key is role service_role (decode JWT role only); tables `businesses`,
   `review_sessions`, `review_events`, `admin_users`, `weekly_summaries` and functions
   `claim_generation`, `review_period_stats` exist; anon key is blocked (401/403); public sign-ups are
   disabled (`/auth/v1/settings` -> `disable_signup`); one minimal Gemini call succeeds; `admin_users` has
   at least 1 row. Report each item as pass/fail with the exact fix.
9. If this is a git repository, commit with the message `Configure <Business name>` (do not push).

## FINAL REPORT (keep it short)
- Values set (name, slug, category, colours with contrast ratios, chips, time zone, logo).
- Defaults you chose and why.
- Check results (`npm run check`, visual check, environment check).
- My remaining steps as a numbered checklist, following `docs/client-setup-guide.pdf`:
  Supabase project (Mumbai) -> run 0001 then 0002 -> sign-ups off -> create owner user -> run
  create_admin.sql -> fill .env.local -> `npm run dev` test -> push to GitHub -> Vercel (env vars incl.
  CRON_SECRET, then SITE_URL + redeploy, Supabase Site URL) -> download QR from the LIVE /admin/qr ->
  print and test-scan -> on-site demo -> clear test data with
  `truncate public.review_events, public.review_sessions, public.weekly_summaries;`.
