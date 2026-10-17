import type { CSSProperties } from "react";
import type { BusinessConfig } from "@/types/business";

const HEX = /^#[0-9a-fA-F]{6}$/;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Readable text colour to place on top of `background`. */
export function readableOn(background: string): string {
  return contrastRatio(background, "#FFFFFF") >= contrastRatio(background, "#1C1917")
    ? "#FFFFFF"
    : "#1C1917";
}

/**
 * Brand colours from the configuration, exposed as CSS custom properties
 * (consumed by Tailwind utilities like `bg-brand` in globals.css).
 */
export function brandThemeStyle(config: Pick<BusinessConfig, "primaryColor" | "secondaryColor">): CSSProperties {
  const primary = HEX.test(config.primaryColor) ? config.primaryColor : "#44403C";
  const secondary = HEX.test(config.secondaryColor) ? config.secondaryColor : "#F5F5F4";
  return {
    "--brand-primary": primary,
    "--brand-on-primary": readableOn(primary),
    "--brand-secondary": secondary,
    "--brand-on-secondary": readableOn(secondary),
  } as CSSProperties;
}
