import type { ComponentType, ReactNode, SVGProps } from "react";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-medium text-muted">{eyebrow}</p>}
        <h1 className="font-display mt-0.5 text-[2rem] leading-tight font-semibold text-ink sm:text-[2.25rem]">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-muted">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`rounded-3xl bg-white shadow-[0_1px_2px_rgba(35,26,20,0.04)] ring-1 ring-black/[0.05] ${className}`}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-4 ${padded ? "px-6 pt-6" : "px-6 pt-6 pb-2"}`}>
          <div>
            {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? "p-6" : ""}>{children}</div>
    </section>
  );
}

export function IconBadge({ Icon, tone = "soft" }: { Icon: Icon; tone?: "soft" | "inverse" }) {
  return (
    <span
      className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
        tone === "inverse" ? "bg-white/15 text-on-brand" : "bg-brand-soft text-brand"
      }`}
    >
      <Icon className="size-6" />
    </span>
  );
}

const numberFormat = new Intl.NumberFormat("en-IN");

export function StatCard({
  label,
  value,
  hint,
  Icon,
  highlight = false,
}: {
  label: string;
  value: number;
  hint: string;
  Icon: Icon;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${
        highlight
          ? "bg-brand text-on-brand shadow-[0_18px_36px_-22px_var(--brand-primary)]"
          : "bg-white ring-1 ring-black/[0.05]"
      }`}
    >
      <IconBadge Icon={Icon} tone={highlight ? "inverse" : "soft"} />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${highlight ? "text-on-brand/80" : "text-muted"}`}>{label}</p>
        <p className="mt-0.5 text-[1.7rem] leading-tight font-bold tracking-tight tabular-nums">
          {numberFormat.format(value)}
        </p>
        <p className={`mt-0.5 text-xs leading-snug ${highlight ? "text-on-brand/75" : "text-muted"}`}>
          {hint}
        </p>
      </div>
    </div>
  );
}

export function formatNumber(value: number) {
  return numberFormat.format(value);
}

export interface BarItem {
  label: string;
  value: number;
  /** Optional small text after the value, e.g. "35%". */
  suffix?: string;
}

/**
 * Single-series bar list: label and value as text on one line, bar below.
 * The numbers are real text, so screen readers get the data; bars are visual.
 */
export function BarList({ items, label }: { items: BarItem[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul aria-label={label} className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.label} title={`${item.label}: ${item.value}${item.suffix ? ` (${item.suffix})` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-ink">{numberFormat.format(item.value)}</span>
              {item.suffix && <span className="ml-1.5 text-xs text-muted">{item.suffix}</span>}
            </span>
          </div>
          <div aria-hidden className="mt-1.5 h-3 rounded-r-[4px] bg-brand-soft/60">
            <div
              className="h-3 rounded-r-[4px] bg-brand"
              style={{ width: `${(item.value / max) * 100}%`, minWidth: item.value ? 4 : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
