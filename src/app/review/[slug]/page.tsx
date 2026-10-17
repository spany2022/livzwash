import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BusinessHeader } from "@/components/review/BusinessHeader";
import { ReviewFlow } from "@/components/review/ReviewFlow";
import { getBusinessConfigBySlug, getConfiguredBusinesses, toPublicBusiness } from "@/lib/review/business";
import { validateBusinessConfig } from "@/lib/validation/businessConfig";

// One static page per configured business: fast to load from the CDN.
export function generateStaticParams() {
  return getConfiguredBusinesses().map((b) => ({ slug: b.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/review/[slug]">): Promise<Metadata> {
  const config = getBusinessConfigBySlug((await params).slug);
  return config ? { title: `${config.name} · Share your experience` } : {};
}

export default async function ReviewPage({ params }: PageProps<"/review/[slug]">) {
  const config = getBusinessConfigBySlug((await params).slug);
  if (!config) notFound();

  const report = validateBusinessConfig(config);
  if (report.errors.length > 0) {
    console.error("[config] Invalid business configuration:\n- " + report.errors.join("\n- "));
    return (
      <Shell>
        <p role="alert" className="text-center text-muted">
          This page isn&apos;t available right now. Please let a member of staff know.
        </p>
      </Shell>
    );
  }

  const business = toPublicBusiness(config);
  return (
    <Shell>
      <BusinessHeader business={business} />
      <section
        aria-label="Share your experience"
        className="mt-8 rounded-[2rem] bg-white/55 p-5 shadow-[0_30px_60px_-40px_rgba(35,26,20,0.55)] ring-1 ring-white/70 backdrop-blur-sm sm:p-7"
      >
        <ReviewFlow business={business} />
      </section>
      <p className="mt-6 text-center text-xs text-muted">
        Your feedback goes directly to {business.name}.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="paper-bg flex min-h-dvh flex-col items-center px-4 pt-10 pb-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
