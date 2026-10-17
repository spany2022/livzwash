import Image from "next/image";
import { DownloadIcon } from "./icons";

/** Displays the QR code with PNG (print) and SVG (design tools) downloads. */
export function QRCodeCard({
  url,
  pngDataUrl,
  svgDataUrl,
  fileBase,
}: {
  url: string;
  pngDataUrl: string;
  svgDataUrl: string;
  fileBase: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <section className="rounded-3xl bg-brand p-6 text-on-brand shadow-[0_24px_48px_-28px_var(--brand-primary)]">
        <div className="rounded-2xl bg-white p-4">
          <Image
            src={pngDataUrl}
            alt={`QR code linking to ${url}`}
            width={320}
            height={320}
            unoptimized
            className="mx-auto h-auto w-full max-w-[320px]"
          />
        </div>
        <p className="mt-4 text-center text-sm font-semibold">Scan to share your experience</p>
      </section>

      <section className="flex flex-col gap-6 rounded-3xl bg-white p-6 ring-1 ring-black/[0.05]">
        <div>
          <h2 className="text-lg font-semibold text-ink">Links to</h2>
          <p className="mt-2 rounded-2xl bg-brand-soft/35 px-4 py-3 font-mono text-sm break-all text-ink">{url}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={pngDataUrl}
            download={`${fileBase}.png`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 font-semibold text-on-brand transition hover:brightness-110"
          >
            <DownloadIcon className="size-5" /> Download PNG
          </a>
          <a
            href={svgDataUrl}
            download={`${fileBase}.svg`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-semibold text-ink ring-1 ring-black/10 transition hover:ring-brand/40"
          >
            <DownloadIcon className="size-5" /> Download SVG
          </a>
        </div>
        <ul className="grid gap-3 text-sm text-muted sm:grid-cols-2">
          <li className="rounded-2xl bg-brand-soft/35 p-4"><span className="font-semibold text-ink">PNG</span> — 1024 px, ready to print on table cards, bills and posters.</li>
          <li className="rounded-2xl bg-brand-soft/35 p-4"><span className="font-semibold text-ink">SVG</span> — sharp at any size; give this to your designer.</li>
        </ul>
        <p className="text-sm text-muted">Test-scan with a phone before printing in bulk.</p>
      </section>
    </div>
  );
}
