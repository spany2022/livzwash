# AI QR Review & Customer Feedback System

A reusable, mobile-first QR review system. Customers scan a QR code, rate their
visit, and either:

- **4–5 stars:** pick what they liked → AI drafts a short review from *only*
  their choices/words → they edit, regenerate or approve → **Post on Google**
  opens the business's Google review page (the review is copied to their
  clipboard; *they* post it).
- **1–3 stars:** pick what could be better → write what happened → feedback is
  stored **privately** for the business's admins.

Build once, then reuse for any business (café, salon, gym, clinic, hotel…) by
changing `src/config/business.ts` and `public/brand/`. The first configuration
is the demo **GoodMorning Café**.

> It is deliberately **not** a multi-tenant SaaS: one codebase copy + one
> Supabase project + one Vercel project per client.

---

## 1. Tech stack

| Layer | Choice | Cost |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Server Components, `proxy.ts`), React 19, TypeScript | Free |
| Styling | Tailwind CSS v4, `next/font` (self-hosted fonts) | Free |
| Database/Auth | Supabase (PostgreSQL, Row Level Security, Auth) | Free tier |
| AI | Google Gemini API via REST (`gemini-3.5-flash-lite` by default) | Free tier* |
| QR | `qrcode` npm package (MIT) | Free |
| Validation | `zod` | Free |
| Tests | Vitest + Testing Library | Free |
| Hosting | Vercel + GitHub | Free tier* |

\* **Potential costs to know about:**
- **Vercel Hobby is for non-commercial use.** A paying client's deployment should run on Vercel Pro (or another host).
- **Gemini free tier** has rate limits, and Google may use free-tier prompts to improve its products. For client work, consider enabling billing (flash-lite models cost very little per review).
- **Supabase free tier** pauses projects after about a week of inactivity and has storage limits. A live café won't be inactive, but a demo might be.

No Redis, Docker, queues, paid analytics, SMS/WhatsApp or Stripe are used.

---

## 2. Installation

Requirements: Node.js 20.9+ (tested on Node 25), npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
```

## 3. Environment variables

| Variable | Where it's used | Secret? |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server only (`/api/generate-review`) | **Yes** — never prefix with `NEXT_PUBLIC_` |
| `GEMINI_MODEL` | Optional model override | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Server (admin auth, API routes) | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Server (admin auth). Supabase's "anon" or "publishable" key | No — RLS gives it no table access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (customer API routes). "service_role" or "secret" key | **Yes** — bypasses RLS |
| `SITE_URL` | Optional. Public base URL used in QR codes, e.g. `https://reviews.goodmorningcafe.in` | No |
| `CRON_SECRET` | Protects the automatic Monday summary job. Any long random string | **Yes** |

`.env.local` is git-ignored. Only `.env.example` is committed.

## 4. Supabase setup

1. Create a free project at <https://supabase.com>.
2. **Project Settings → API**: copy the Project URL, the anon/publishable key and the service_role/secret key into `.env.local`.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Admins are created manually, and customers never need accounts.

## 5. Database setup

Open **SQL Editor** in Supabase and run these files **in order** (paste the
whole file → Run), or use the Supabase CLI (`supabase db push`):

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql): core tables and security
2. [`supabase/migrations/0002_weekly_summaries.sql`](supabase/migrations/0002_weekly_summaries.sql): weekly AI summaries

It creates:

| Table | Purpose |
| --- | --- |
| `businesses` | One row per business (synced automatically from `src/config/business.ts`) |
| `review_sessions` | One row per customer visit: rating, categories, customer text, AI draft, final review, status, generation count, admin feedback status/notes |
| `review_events` | Funnel events: `qr_scan`, `rating_selected`, `categories_selected`, `ai_requested`, `ai_generated`, `review_edited`, `review_approved`, `google_clicked`, `private_feedback_submitted` |
| `admin_users` | Which auth users may administer which business |

Plus RLS policies, column-level grants, indexes, a rating `CHECK (1–5)`, and SQL
functions for atomic AI-limit claims and admin metrics/analytics.

## 6. AI API setup

1. Go to <https://aistudio.google.com/apikey> and create an API key.
2. Put it in `GEMINI_API_KEY` in `.env.local` (and in Vercel later).
3. Optional: set `GEMINI_MODEL` to change the model without code changes. The Gemini 2.5 models are restricted for new projects, so the default is `gemini-3.5-flash-lite`. See <https://ai.google.dev/gemini-api/docs/models>.

The prompt lives in [`src/config/ai.ts`](src/config/ai.ts). The browser never
talks to Gemini: Browser → `/api/generate-review` → Gemini → route → Browser.

## 7. Local development

```bash
npm run dev          # http://localhost:3000 → redirects to /review/goodmorning-cafe
```

Without Supabase configured the customer UI still renders, but session
tracking and AI generation fail gracefully: customers see "We couldn't create
your review right now" with **Try Again / Write it myself**.

## 8. Scripts

| Command | What |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm test` | Vitest unit, API-route and UI-flow tests |
| `npm run build` / `npm start` | Production build / serve |
| `npm run check` | All of the above (run before every deploy) |

---

## 9. Changing the business configuration

Everything client-specific is in **`src/config/business.ts`** + **`public/brand/`**.
Full guide with salon/gym/clinic examples: **[docs/configuration.md](docs/configuration.md)**.

- **Business name / tagline:** `name`, `tagline`
- **Category:** `category` is a plain string, so any value works (`"cafe"`, `"gym"`, `"dental-clinic"`, `"my-new-business"`). No type changes are needed.
- **Logo:** put the file in `public/brand/` and set `logo: "/brand/your-logo.png"`
- **Colours:** `primaryColor` (buttons/stars) and `secondaryColor` (background), as 6-digit hex
- **Positive categories:** `positiveCategories` are the chips for 4–5 stars
- **Negative categories:** `negativeCategories` are the chips for 1–3 stars
- **URL slug:** `slug` sets the QR link `/review/<slug>`. Reprint QR codes if you change it.

## 10. Google Review URL

Get the client's link from their **Google Business Profile**: search for the
business on Google or Maps while signed in as the owner → **Ask for reviews** /
**Get more reviews** → copy the link (looks like `https://g.page/r/…/review`).
Paste it into `googleReviewUrl`.

- Only `https://` Google links are accepted (google.com, g.page, goo.gl). Anything else, including the `YOUR_GOOGLE_REVIEW_URL` placeholder, disables the button and shows a warning on the admin dashboard.
- Never invent a Place ID or review URL.
- The app **never** submits, automates or scrapes Google. It only opens the link and records **`google_clicked`**. It never claims a review was posted.

⚠️ **Review-gating policy:** read [docs/configuration.md §7](docs/configuration.md#7-google-review-policy--read-before-launch)
before commercial launch. Showing the Google button only to happy customers can
conflict with Google's policy against selectively soliciting positive reviews.
Set `offerGoogleReviewAfterPrivateFeedback: true` to also offer the Google
link after private feedback.

## 11. Generating the QR code

Sign in to `/admin` → **QR Code**. It shows the QR for
`<SITE_URL>/review/<slug>` with **Download PNG** (1024 px, for print) and
**Download SVG** (for designers). Set `SITE_URL` in production so the QR always
uses your real domain. Test-scan before printing.

## 12. Creating another client's version

1. Copy the repo (new repo or branch per client).
2. Edit `src/config/business.ts`, replace `public/brand/` assets.
3. `npm run check`.
4. New Supabase project → run the migration → create the admin (below).
5. New Vercel project → set env vars → deploy → download QR from `/admin/qr`.

Details: [docs/configuration.md §6](docs/configuration.md#6-creating-another-clients-version).

## 13. Vercel deployment

1. Push the repo to GitHub.
2. <https://vercel.com/new> → import the repo (framework: Next.js, default settings).
3. **Settings → Environment Variables**: add `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL` and `CRON_SECRET`.
   `vercel.json` registers the weekly-summary job; Vercel sends `CRON_SECRET` with it automatically.
4. Deploy. Optionally add the client's custom domain and update `SITE_URL`.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to your domain.

## 14. Admin setup

1. Supabase → **Authentication → Users → Add user** → create the owner with an email and a strong password (tick "Auto confirm").
2. SQL Editor → open [`supabase/create_admin.sql`](supabase/create_admin.sql), set the slug and email, and run it.
3. Visit `/admin/login` and sign in.

Admin pages:

| Page | What |
| --- | --- |
| `/admin` | Metrics: QR Scans, Total Review Sessions, 1–3 Star Feedback, 4–5 Star Sessions, AI-Generated Reviews, **Google Review Clicks**, Completed Sessions. Also recent new feedback. Filter: Today / 7 Days / 30 Days / All Time |
| `/admin/feedback` | Private feedback list with status filter (New / In Progress / Resolved / Closed) |
| `/admin/feedback/[id]` | Full feedback, change status, internal notes |
| `/admin/analytics` | Rating distribution, category frequency (liked vs could-be-better), date filters |
| `/admin/insights` | Weekly AI summary: exact numbers vs the previous week, plus what went well, what to improve and suggestions |
| `/admin/qr` | Display and download the QR code |

Metric definitions are literal: "Google Review Clicks" counts sessions whose
customer clicked the button (de-duplicated per session), *not* posted reviews.
"Completed" means the customer clicked Google or sent private feedback.

---

## 15. Security considerations

**Keys**
- `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are read only in server code. Modules that use them import `server-only`, so the build fails if one is imported into client code.
- The browser bundle contains no Supabase client at all. Admin login runs through a Server Action.

**Database (RLS)**
- RLS is enabled on every table. The `anon` role has **no** privileges, so the public anon key can't read or write anything.
- Customer writes go only through validated API routes using the service-role key.
- Admins (Supabase Auth) can `SELECT` rows only for businesses they're linked to in `admin_users`. They can `UPDATE` only `feedback_status` and `admin_notes` (column-level grant), and only on private-feedback rows.
- Metrics and analytics functions are `SECURITY INVOKER`, so RLS applies to them too.

**Admin routes**
- `src/proxy.ts` redirects unauthenticated `/admin/*` requests to `/admin/login`.
- Every admin page and server action also calls `requireAdmin()`, which verifies the user with Supabase Auth (`getUser()`) and checks admin membership through RLS. Hiding UI is never the only protection.

**Input validation** (server-side, with zod)
- Rating must be an integer 1–5. AI drafts are allowed only for 4–5 stars and private feedback only for 1–3.
- Categories must exist in the configuration, are de-duplicated, and are capped at 12.
- Text limits: customer input 500 chars, feedback 3–2000, review 5–600, admin notes 2000. Control characters are stripped.
- Session IDs must be UUIDs and must belong to the business. JSON bodies are capped at 16 KB and must be `application/json`.

**Errors**
- Customers see only friendly messages. Stack traces, DB errors, and AI errors are logged server-side only.

**Cron job**
- `/api/cron/weekly-summary` only runs when the request carries `Authorization: Bearer <CRON_SECRET>` (compared in constant time). If `CRON_SECRET` isn't set, the endpoint always refuses.

**Headers**
- `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, a strict referrer policy, a locked-down `Permissions-Policy`, and no `X-Powered-By`.

**AI safety**
- The prompt allows only customer-provided facts, and customer text is fenced and treated as data (prompt-injection resistant).
- A post-generation guard rejects drafts containing numbers, prices, star ratings, hashtags or AI mentions that the customer didn't write. It retries once, then fails honestly rather than showing invented content.

### Abuse protection and its MVP limitations

| Protection | How | Limitation |
| --- | --- | --- |
| AI generations per session | Atomic DB counter (`claim_generation`): 5 per session (1 draft + 4 regenerations) | Someone can start new sessions to get more |
| Per-IP rate limits | In-memory fixed window: session start 30/10 min, AI 15/10 min, feedback 5/10 min | **Per server instance** and reset on cold start, so on Vercel it slows casual abuse but won't stop a distributed attacker. Upgrade path: Vercel WAF rate limiting or a DB-backed counter |
| Duplicate submissions | Buttons disabled while in flight; server updates only non-finished sessions; unique index on once-per-session events | — |
| Spam | Hidden honeypot field; link-stuffing/repeat-character heuristic (silently accepted, not stored) | Heuristic only |
| Resume on reload | A reload re-uses the session (via `sessionStorage`) instead of counting another QR scan | Private-mode browsers may count a reload as a new scan |

Before going live with a real client: rotate any keys that were ever shared,
use a strong admin password, keep sign-ups disabled, and review the Google
policy section above.

### Weekly AI summary (`/admin/insights`)

- **Automatic:** every Monday at 07:00 IST (`30 1 * * 1` UTC in `vercel.json`), Vercel Cron calls `/api/cron/weekly-summary`, which writes **last week's** summary (Monday–Sunday in `timezone`) if one doesn't exist yet. It never overwrites.
- **Manual:** on the Insights page, pick any past week (or this week so far) and click **Create summary** or **Regenerate**. Regenerating is limited to 5 times per week (`weeklySummaryAIConfig` in `src/config/ai.ts`).
- **Accuracy:**
  - All numbers and category counts come straight from the database (`review_period_stats`). The AI only writes the sentences.
  - Any number the AI writes that isn't in the data gets the answer rejected (one retry, then an error). The page says the text is AI-written.
- **Privacy:** only the week's numbers and customer comments are sent to Gemini. Phone numbers and emails are removed first, and at most 60 comments of 400 characters each are sent.
- **Cost:** about one Gemini call per week, plus manual regenerations. Summaries are saved, so opening the page costs nothing.
- **No visits that week:** no AI call is made.

---

## Project structure

```
supabase/
  migrations/0001_init.sql   schema, RLS, grants, SQL functions
  create_admin.sql           link an auth user as admin
docs/configuration.md        per-client configuration guide
public/brand/                client logo
src/
  proxy.ts                   /admin auth redirect (Next 16 "proxy", formerly middleware)
  config/
    business.ts              ← per-client configuration
    ai.ts                    AI prompt & limits
    limits.ts                input/rate limits
  types/                     business, review, feedback, database types
  lib/
    ai/                      prompt builder, Gemini REST client, fabrication guard
    supabase/                admin (service role), server (RLS/cookies), proxy
    validation/              zod schemas, text normalisation, config validator
    review/                  business sync, sessions/events, API client, session hook
    admin/                   requireAdmin, dashboard queries
  app/
    review/[slug]/           customer page (statically generated)
    admin/login/             admin sign-in
    admin/(protected)/       dashboard, feedback, analytics, qr
    api/session|generate-review|review|feedback/
  components/
    review/                  StarRating, CategorySelector, ReviewGenerator, ReviewPreview,
                             GoogleReviewButton, PrivateFeedbackForm, ReviewFlow, BusinessHeader
    admin/                   Dashboard, MetricsCards, FeedbackList, FeedbackDetails,
                             RatingAnalytics, QRCodeCard, …
  test/                      Vitest suites
```
