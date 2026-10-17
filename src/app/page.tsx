import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/config/business";
import { getConfiguredBusinesses } from "@/lib/review/business";

/**
 * The root URL forwards to the review page when there's one business, and
 * lets the customer pick a branch when there are several. (QR codes link
 * straight to /review/<slug>, so most customers never see this page.)
 */
export default function Home() {
  const businesses = getConfiguredBusinesses();
  if (businesses.length === 1) redirect(`/review/${businesses[0]!.slug}`);

  return (
    <main className="paper-bg flex min-h-dvh flex-col items-center px-4 pt-14 pb-8">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <Image
          src={brand.wordmark}
          alt={`${brand.name} logo`}
          width={1025}
          height={286}
          priority
          className="h-auto w-56 sm:w-64"
        />
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Share your experience</h1>
          <p className="mt-1 text-sm text-muted">Which branch did you visit?</p>
        </div>
        <ul className="flex w-full flex-col gap-3">
          {businesses.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/review/${b.slug}`}
                className="flex min-h-14 items-center justify-center rounded-2xl bg-brand px-5 text-base font-semibold text-on-brand shadow-[0_14px_28px_-18px_var(--brand-primary)] transition hover:opacity-90"
              >
                {b.branch ?? b.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
