import Image from "next/image";
import type { PublicBusiness } from "@/types/business";

/** Logo + name + tagline, all from the business configuration. Server component. */
export function BusinessHeader({ business }: { business: PublicBusiness }) {
  if (business.wordmark) return <WordmarkHeader business={business} wordmark={business.wordmark} />;

  const isSvg = business.logo.toLowerCase().split("?")[0]!.endsWith(".svg");
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <div className="relative">
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full border border-dashed opacity-40"
          style={{ borderColor: "var(--brand-primary)" }}
        />
        <Image
          src={business.logo}
          alt={`${business.name} logo`}
          width={80}
          height={80}
          priority
          unoptimized={isSvg}
          className="size-20 rounded-full object-cover shadow-[0_10px_30px_-12px_rgba(35,26,20,0.5)]"
        />
      </div>
      <div>
        <p className="font-display text-[1.35rem] leading-tight font-semibold text-ink [font-variation-settings:'SOFT'_100]">
          {business.name}
        </p>
        {business.branch && <p className="mt-0.5 text-sm font-semibold text-brand">{business.branch}</p>}
        {business.tagline && <p className="mt-0.5 text-sm tracking-wide text-muted">{business.tagline}</p>}
      </div>
    </header>
  );
}

/** Wide text logo variant, with the branch shown as a pill underneath. */
function WordmarkHeader({ business, wordmark }: { business: PublicBusiness; wordmark: string }) {
  const isSvg = wordmark.toLowerCase().split("?")[0]!.endsWith(".svg");
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <h1 className="sr-only">{business.name}</h1>
      <Image
        src={wordmark}
        alt={`${business.name} logo`}
        width={1025}
        height={286}
        priority
        unoptimized={isSvg}
        className="h-auto w-56 sm:w-64"
      />
      <div className="flex flex-col items-center gap-1.5">
        {business.branch && (
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold tracking-wide text-on-brand">
            {business.branch} branch
          </span>
        )}
        {business.tagline && <p className="text-sm tracking-wide text-muted">{business.tagline}</p>}
      </div>
    </header>
  );
}
