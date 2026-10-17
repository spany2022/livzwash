export type PageItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Page numbers to show, collapsing long ranges:
 *   1 2 3 4 5 6 7          (7 or fewer pages: show all)
 *   1 2 3 4 5 … 12         (near the start)
 *   1 … 5 6 7 … 12         (in the middle)
 *   1 … 8 9 10 11 12       (near the end)
 * Always 7 slots once there are more than 7 pages, so the bar never jumps in width.
 */
export function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const page = Math.min(Math.max(1, current), total);
  if (page <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", total];
  if (page >= total - 3) return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis-start", page - 1, page, page + 1, "ellipsis-end", total];
}

/** "Showing 26–50 of 132" range for the current page (1-based, inclusive). */
export function getShowingRange(page: number, pageSize: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(total, page * pageSize) };
}
