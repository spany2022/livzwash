import QRCode from "qrcode";
import { QRCodeCard } from "@/components/admin/QRCodeCard";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getSiteUrl } from "@/lib/siteUrl";

export default async function QRPage() {
  const { config } = await requireAdmin();
  const url = `${await getSiteUrl()}/review/${config.slug}`;

  const options = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#1C1917", light: "#FFFFFF" } };
  const [pngDataUrl, svg] = await Promise.all([
    QRCode.toDataURL(url, { ...options, width: 1024 }),
    QRCode.toString(url, { ...options, type: "svg" }),
  ]);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="QR Code"
        description={
          config.branch
            ? `Customers at the ${config.branch} branch scan this to open its review page.`
            : "Customers scan this to open your review page."
        }
      />
      <QRCodeCard url={url} pngDataUrl={pngDataUrl} svgDataUrl={svgDataUrl} fileBase={`${config.slug}-review-qr`} />
    </div>
  );
}
