import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackDetails } from "@/components/admin/FeedbackDetails";
import { ArrowLeftIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getFeedback } from "@/lib/admin/queries";
import { sessionIdSchema } from "@/lib/validation/schemas";

export default async function FeedbackDetailPage({ params }: PageProps<"/admin/feedback/[id]">) {
  const { supabase, business, config } = await requireAdmin();
  const id = sessionIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const feedback = await getFeedback(supabase, business.id, id.data);
  if (!feedback) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/feedback"
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeftIcon className="size-4" /> All feedback
      </Link>
      <PageHeader title="Feedback details" />
      <FeedbackDetails feedback={feedback} timeZone={config.timezone ?? "UTC"} />
    </div>
  );
}
