# Client configuration guide

This codebase is built **once** and reused for every client. To make a version
for a new business you change **two things only**:

| What | Where |
| --- | --- |
| Business settings | `src/config/business.ts` |
| Brand assets (logo) | `public/brand/` |

The review components (`src/components/review/*`), API routes, database schema
and admin dashboard stay **unchanged**. No TypeScript types need editing.

---

## 1. The configuration file

`src/config/business.ts` exports one `businessConfig` object:

```ts
export const businessConfig: BusinessConfig = {
  name: "GoodMorning Café",        // shown on the page, admin, browser tab
  slug: "goodmorning-cafe",        // QR link: /review/goodmorning-cafe
  category: "cafe",                // ANY text: "salon", "gym", "dental-clinic", ...
  logo: "/brand/logo.svg",         // file in public/brand/ (or an https URL)
  googleReviewUrl: "YOUR_GOOGLE_REVIEW_URL",
  primaryColor: "#8B5E3C",         // buttons, stars, selected chips
  secondaryColor: "#F5EBDD",       // page background
  positiveCategories: ["Food", "Staff", "Service", "Ambience", "Cleanliness", "Value"],
  negativeCategories: ["Food", "Staff", "Service", "Cleanliness", "Waiting Time", "Value", "Ambience"],
  tagline: "Good food. Good mood.", // optional
  timezone: "Asia/Kolkata",         // optional, for "Today" in analytics
  offerGoogleReviewAfterPrivateFeedback: false, // optional, see §7
};
```

### Field reference

| Field | Required | Notes |
| --- | --- | --- |
| `name` | ✓ | Business display name. |
| `slug` | ✓ | Lowercase letters/numbers with hyphens. Appears in the QR URL. **Changing it changes the QR code** — reprint QR codes after changing. |
| `category` | ✓ | A plain `string`. Any value works. It's used to tell the AI the general type of place ("dental-clinic" → "dental clinic"). |
| `logo` | ✓ | Path under `public/` (e.g. `/brand/logo.png`) or an `https://` URL. Square works best, at least 160×160 px. Also used as the browser tab icon. |
| `googleReviewUrl` | ✓ | Must be an `https://` Google link (google.com, g.page, goo.gl, maps.app.goo.gl). Until it is valid, the "Post on Google" button is replaced by a "Copy my review" fallback and the admin dashboard shows a warning. |
| `primaryColor` | ✓ | 6-digit hex. Text colour on top of it (white/dark) is chosen automatically for contrast. Aim for a colour dark enough to read white text on. |
| `secondaryColor` | ✓ | 6-digit hex. Page background — keep it light. |
| `positiveCategories` | ✓ | 1–12 chips shown for 4–5 stars ("What did you like?"). Max 40 characters each. |
| `negativeCategories` | ✓ | 1–12 chips shown for 1–3 stars ("What could have been better?"). |
| `tagline` | | Shown under the business name. |
| `timezone` | | IANA name (e.g. `Asia/Kolkata`, `Asia/Dubai`, `Europe/London`). Defaults to `UTC`. |
| `offerGoogleReviewAfterPrivateFeedback` | | Default `false`. See §7. |

The configuration is validated automatically. Errors (e.g. a bad hex colour)
make the review page show a polite "not available" message and are logged on
the server. Warnings (e.g. placeholder Google URL) appear on the admin
dashboard. `npm test` also checks the configuration.

---

## 2. Examples for other industries

Only the values change — never the types or components.

### Café (the demo)
```ts
category: "cafe",
positiveCategories: ["Food", "Staff", "Service", "Ambience", "Cleanliness", "Value"],
negativeCategories: ["Food", "Staff", "Service", "Cleanliness", "Waiting Time", "Value", "Ambience"],
```

### Salon
```ts
name: "Glow Hair Studio",
slug: "glow-hair-studio",
category: "salon",
positiveCategories: ["Service", "Staff", "Result", "Cleanliness", "Ambience", "Experience"],
negativeCategories: ["Service", "Staff", "Result", "Waiting Time", "Cleanliness", "Value"],
```

### Spa
```ts
category: "spa",
positiveCategories: ["Therapist", "Relaxation", "Ambience", "Cleanliness", "Hospitality", "Value"],
negativeCategories: ["Therapist", "Waiting Time", "Cleanliness", "Noise", "Value", "Booking"],
```

### Gym
```ts
category: "gym",
positiveCategories: ["Trainers", "Equipment", "Cleanliness", "Atmosphere", "Classes", "Value"],
negativeCategories: ["Equipment", "Crowding", "Cleanliness", "Trainers", "Staff", "Value"],
```

### Dental clinic
```ts
category: "dental-clinic",
positiveCategories: ["Doctor", "Staff", "Explanation", "Comfort", "Cleanliness", "Punctuality"],
negativeCategories: ["Waiting Time", "Staff", "Explanation", "Billing", "Comfort", "Cleanliness"],
```

### Hotel, car service, retail…
```ts
category: "hotel"          // or "car-service", "retail-store", "aesthetic-clinic"
```

### Any new industry
```ts
category: "my-new-business"
```

That's it — no code change is needed for a new category.

> **Tip:** Chip labels are shown to the AI as "aspects the customer liked", so
> use short, general words ("Staff", "Result"). Don't put claims in them
> ("Best coffee in town") — the AI would repeat them as if the customer said it.

---

## 3. Changing the logo

1. Put the client's logo in `public/brand/`, e.g. `public/brand/logo.png`.
2. Set `logo: "/brand/logo.png"` in `src/config/business.ts`.
3. Delete the old café logo (`public/brand/logo.svg`) if unused.

PNG, JPG, WebP and SVG all work. It is displayed in a circle, so a square
logo with some padding looks best.

## 4. Changing colours

Set `primaryColor` and `secondaryColor`. They're exposed as CSS variables and
used through Tailwind utilities (`bg-brand`, `text-brand`, `bg-brand-soft`) —
there are no hard-coded brand colours in components.

Check contrast: primary should have ≥ 4.5 : 1 contrast against white (use any
online contrast checker). The café brown `#8B5E3C` is ~5.6 : 1.

Fonts (Fraunces + Figtree) are set in `src/app/layout.tsx`. Change them there
if a client needs a different typographic feel; that's the only file involved.

## 5. Changing the Google Review URL

See README → "Google Review URL" for how to get the link from the client's
Google Business Profile. Paste it into `googleReviewUrl`. Never invent a URL.

## 6. Creating another client's version

```bash
# 1. Copy the codebase
git clone <this repo> client-name-reviews && cd client-name-reviews
rm -rf .git && git init          # or create a new branch/repo per client

# 2. Edit src/config/business.ts and public/brand/
# 3. Check everything
npm install
npm run check                    # lint + typecheck + tests + build
```

Then give each client their **own** Supabase project and Vercel project:

1. New Supabase project → run `supabase/migrations/0001_init.sql`.
2. Create the client's admin user and run `supabase/create_admin.sql` (with their slug + email).
3. New Vercel project from the new repo → add the environment variables.
4. Open `/admin/qr`, download the QR code, test-scan it, then print.

Keeping one Supabase project per client keeps each client's customer data
fully separate without building multi-tenant SaaS features.

## 7. Google review policy — read before launch

Google's review policy states that businesses must not **"selectively solicit
positive reviews from customers"** or **"discourage or prohibit negative
reviews"** (often called *review gating*). The default flow — Google button for
4–5 stars only, private feedback for 1–3 stars — can be seen as exactly that.
Consequences can include removal of reviews or restrictions on the Business
Profile.

Options:

- Set `offerGoogleReviewAfterPrivateFeedback: true`. After a 1–3 star customer
  sends private feedback, they're also offered an optional "Review on Google"
  link. This keeps the private channel while not preventing public reviews.
- Also consider local consumer-protection rules on reviews in the client's
  market (e.g. India's BIS standard IS 19000:2022 on online consumer reviews, or the US FTC rule on fake reviews and review suppression).

Also note: the AI writes a *draft* from the customer's own choices, and the
customer must approve/edit it and post it themselves from their own Google
account. Verify the current Google policies
(https://support.google.com/contributionpolicy/answer/7400114) before
commercial launch — they change over time. This isn't legal advice.

## 8. Other tunables (optional)

| File | What |
| --- | --- |
| `src/config/ai.ts` | AI prompt, model, temperature, timeout, generations per session |
| `src/config/limits.ts` | Text length limits and rate limits |
