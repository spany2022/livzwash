import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { brand } from "@/config/business";
import { brandThemeStyle } from "@/lib/theme";
import "./globals.css";

// Fonts are self-hosted by next/font at build time (no runtime Google request).
const display = Fraunces({
  variable: "--font-display-face",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});
const body = Figtree({ variable: "--font-body", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline ?? `Share your experience with ${brand.name}`,
  robots: { index: false, follow: false },
  icons: { icon: brand.logo },
};

export const viewport: Viewport = {
  themeColor: brand.secondaryColor,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full font-sans" style={brandThemeStyle(brand)}>
        {children}
      </body>
    </html>
  );
}
