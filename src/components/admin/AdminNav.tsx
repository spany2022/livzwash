"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, switchBranch } from "@/app/admin/actions";
import { AnalyticsIcon, DashboardIcon, FeedbackIcon, LogoutIcon, QrIcon, SparkIcon } from "./icons";

const LINKS = [
  { href: "/admin", label: "Dashboard", Icon: DashboardIcon },
  { href: "/admin/feedback", label: "Feedback", Icon: FeedbackIcon },
  { href: "/admin/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/admin/insights", label: "Insights", Icon: SparkIcon },
  { href: "/admin/qr", label: "QR Code", Icon: QrIcon },
] as const;

interface BranchOption {
  slug: string;
  label: string;
}

interface AdminNavProps {
  businessName: string;
  logo: string;
  userEmail: string;
  branches: BranchOption[];
  activeBranch: string;
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Brand({ businessName, logo }: Pick<AdminNavProps, "businessName" | "logo">) {
  const isSvg = logo.toLowerCase().split("?")[0]!.endsWith(".svg");
  return (
    <Link href="/admin" className="flex items-center gap-3 rounded-xl">
      <Image
        src={logo}
        alt=""
        width={40}
        height={40}
        unoptimized={isSvg}
        className="size-10 shrink-0 rounded-xl object-cover"
      />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display text-[1.05rem] font-semibold text-ink">{businessName}</span>
        <span className="block text-[0.7rem] font-semibold tracking-[0.14em] text-brand uppercase">Admin</span>
      </span>
    </Link>
  );
}

/** Branch picker — only shown when the admin manages more than one branch. */
function BranchSwitcher({ branches, activeBranch, pathname }: { branches: BranchOption[]; activeBranch: string; pathname: string }) {
  if (branches.length < 2) return null;
  return (
    <form action={switchBranch}>
      <input type="hidden" name="returnTo" value={pathname} />
      <label className="block">
        <span className="mb-1 block text-[0.7rem] font-semibold tracking-[0.14em] text-muted uppercase">Branch</span>
        <select
          name="branch"
          defaultValue={activeBranch}
          key={activeBranch}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="min-h-11 w-full rounded-xl border border-black/10 bg-brand-soft/40 px-3 text-[0.95rem] font-semibold text-ink focus:border-brand focus:outline-none"
        >
          {branches.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="mt-2 text-sm font-semibold text-brand">
          Switch
        </button>
      </noscript>
    </form>
  );
}

/** Desktop: fixed left sidebar. Mobile: top bar with horizontally scrollable tabs. */
export function AdminNav({ businessName, logo, userEmail, branches, activeBranch }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-black/[0.06] bg-white lg:flex">
        <div className="border-b border-black/[0.06] px-6 py-6">
          <Brand businessName={businessName} logo={logo} />
          {branches.length > 1 && (
            <div className="mt-5">
              <BranchSwitcher branches={branches} activeBranch={activeBranch} pathname={pathname} />
            </div>
          )}
        </div>
        <nav aria-label="Admin" className="flex flex-1 flex-col gap-1.5 px-4 py-6">
          {LINKS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3.5 rounded-xl px-4 text-[0.95rem] font-medium transition ${
                  active
                    ? "bg-brand text-on-brand shadow-[0_10px_22px_-14px_var(--brand-primary)]"
                    : "text-muted hover:bg-brand-soft/60 hover:text-ink"
                }`}
              >
                <Icon className="size-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-black/[0.06] p-4">
          <p className="truncate px-4 pb-2 text-xs text-muted" title={userEmail}>
            {userEmail}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3.5 rounded-xl px-4 text-[0.95rem] font-medium text-muted transition hover:bg-brand-soft/60 hover:text-ink"
            >
              <LogoutIcon className="size-5" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <Brand businessName={businessName} logo={logo} />
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Log out"
              className="grid size-11 place-items-center rounded-xl text-muted hover:bg-brand-soft/60 hover:text-ink"
            >
              <LogoutIcon className="size-5" />
            </button>
          </form>
        </div>
        {branches.length > 1 && (
          <div className="px-4 pt-3">
            <BranchSwitcher branches={branches} activeBranch={activeBranch} pathname={pathname} />
          </div>
        )}
        <nav aria-label="Admin" className="grid grid-cols-5 gap-1 px-2 py-2">
          {LINKS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.7rem] font-medium ${
                  active ? "bg-brand text-on-brand" : "text-muted hover:bg-brand-soft/60"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
