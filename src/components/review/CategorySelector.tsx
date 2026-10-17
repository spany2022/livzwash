"use client";

interface CategorySelectorProps {
  options: readonly string[];
  selected: readonly string[];
  onToggle: (option: string) => void;
  /** id of the visible heading that labels this group. */
  labelledBy: string;
  disabled?: boolean;
}

/** Multi-select chips. Each chip is a toggle button (aria-pressed). */
export function CategorySelector({ options, selected, onToggle, labelledBy, disabled }: CategorySelectorProps) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isOn = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={isOn}
            onClick={() => onToggle(option)}
            className={`inline-flex min-h-12 items-center gap-1.5 rounded-full px-5 text-[0.95rem] font-medium transition duration-200 active:scale-95 disabled:opacity-60 ${
              isOn
                ? "bg-brand text-on-brand shadow-[0_8px_18px_-10px_var(--brand-primary)]"
                : "bg-white/75 text-ink ring-1 ring-inset ring-black/10 hover:ring-brand/40"
            }`}
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden
              className={`size-4 transition-all duration-200 ${isOn ? "w-4 opacity-100" : "-ml-1.5 w-0 opacity-0"}`}
            >
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {option}
          </button>
        );
      })}
    </div>
  );
}
