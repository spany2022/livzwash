import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { brand } from "@/config/business";
import { requireAdmin } from "@/lib/admin/auth";
import { getBusinessConfigBySlug } from "@/lib/review/business";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { business, user, config, branches } = await requireAdmin();
  const options = branches.map((b) => ({ slug: b.slug, label: getBusinessConfigBySlug(b.slug)?.branch ?? b.name }));
  return (
    <div className="admin-bg min-h-dvh">
      <AdminNav
        businessName={branches.length > 1 ? brand.name : business.name}
        logo={config.logo}
        userEmail={user.email ?? ""}
        branches={options}
        activeBranch={business.slug}
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
