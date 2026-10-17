import { describe, expect, it } from "vitest";
import { getPageItems, getShowingRange } from "@/lib/pagination";

describe("getPageItems", () => {
  it("shows every page when there are 7 or fewer", () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the end near the start", () => {
    expect(getPageItems(1, 12)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 12]);
    expect(getPageItems(4, 12)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 12]);
  });

  it("collapses both sides in the middle", () => {
    expect(getPageItems(6, 12)).toEqual([1, "ellipsis-start", 5, 6, 7, "ellipsis-end", 12]);
  });

  it("collapses the start near the end", () => {
    expect(getPageItems(12, 12)).toEqual([1, "ellipsis-start", 8, 9, 10, 11, 12]);
    expect(getPageItems(9, 12)).toEqual([1, "ellipsis-start", 8, 9, 10, 11, 12]);
  });

  it("always includes the current page", () => {
    for (let total = 1; total <= 30; total++) {
      for (let page = 1; page <= total; page++) {
        const items = getPageItems(page, total);
        expect(items).toContain(page);
        expect(items.length).toBeLessThanOrEqual(7);
      }
    }
  });
});

describe("getShowingRange", () => {
  it("computes the visible range", () => {
    expect(getShowingRange(1, 25, 132)).toEqual({ from: 1, to: 25 });
    expect(getShowingRange(6, 25, 132)).toEqual({ from: 126, to: 132 });
    expect(getShowingRange(1, 25, 0)).toEqual({ from: 0, to: 0 });
  });
});
