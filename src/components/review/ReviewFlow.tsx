"use client";

import { useId, useRef, useState } from "react";
import type { PublicBusiness } from "@/types/business";
import { isPositiveRating } from "@/types/review";
import { limits } from "@/config/limits";
import { reviewApi } from "@/lib/review/client";
import { useReviewSession } from "@/lib/review/useReviewSession";
import { StarRating } from "./StarRating";
import { CategorySelector } from "./CategorySelector";
import { ReviewGenerator } from "./ReviewGenerator";
import { ReviewPreview } from "./ReviewPreview";
import { GoogleReviewButton } from "./GoogleReviewButton";
import { CopyReviewButton } from "./CopyReviewButton";
import { PrivateFeedbackForm, type PrivateFeedbackInput } from "./PrivateFeedbackForm";
import { Button, Step, StepHeading } from "./ui";

type FlowStep = "rating" | "liked" | "generating" | "preview" | "share" | "private" | "sent";

const AI_FAILURE = "We couldn't create your review right now.";

/**
 * The whole customer journey. Business-agnostic: everything specific comes
 * from the `business` prop (built from src/config/business.ts).
 */
export function ReviewFlow({ business }: { business: PublicBusiness }) {
  const { slug } = business;
  const session = useReviewSession(slug);

  const [step, setStep] = useState<FlowStep>("rating");
  const [rating, setRating] = useState<number | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [showExtra, setShowExtra] = useState(false);
  const [customerInput, setCustomerInput] = useState("");
  const [review, setReview] = useState("");
  const [writeOwn, setWriteOwn] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "regenerate" | "approve">(null);
  const inFlight = useRef(false);
  const likedHeadingId = useId();
  const extraId = useId();

  function chooseRating(value: number) {
    const branchChanged = rating !== null && isPositiveRating(rating) !== isPositiveRating(value);
    if (branchChanged) {
      setLiked([]);
      setReview("");
      setRemaining(null);
    }
    setRating(value);
    setStep(isPositiveRating(value) ? "liked" : "private");
    void session.ensure().then((id) => {
      if (id) void reviewApi.selectRating(slug, id, value);
    });
  }

  function toggleLiked(category: string) {
    setLiked((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }

  async function generate(mode: "first" | "regenerate") {
    if (inFlight.current || rating === null || liked.length === 0) return;
    inFlight.current = true;
    const isRegenerate = mode === "regenerate";
    setGenerateError(null);
    setPreviewNotice(null);
    if (isRegenerate) setBusy("regenerate");
    else setStep("generating");

    const sessionId = await session.ensure();
    const result = sessionId
      ? await reviewApi.generateReview({ slug, sessionId, rating, categories: liked, customerInput })
      : ({ ok: false, error: AI_FAILURE, code: "no_session" } as const);

    inFlight.current = false;
    setBusy(null);

    if (result.ok) {
      setReview(result.data.review);
      setRemaining(result.data.remaining);
      setWriteOwn(false);
      setStep("preview");
      return;
    }
    const limitReached = result.code === "limit_reached";
    if (limitReached) setRemaining(0);
    if (isRegenerate) {
      setPreviewNotice(
        limitReached
          ? "You’ve used all the new versions for this visit — you can still edit it."
          : "We couldn’t create a new version right now.",
      );
    } else {
      setGenerateError(AI_FAILURE);
    }
  }

  function saveEdit(text: string) {
    setReview(text);
    void session.ensure().then((id) => {
      if (id) void reviewApi.saveEdit(slug, id, text);
    });
  }

  async function approve() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("approve");
    const sessionId = await session.ensure();
    if (sessionId) await reviewApi.approve(slug, sessionId, review);
    inFlight.current = false;
    setBusy(null);
    setStep("share");
  }

  function trackGoogleClick() {
    void session.ensure().then((id) => {
      if (id) void reviewApi.trackGoogleClick(slug, id);
      session.finish();
    });
  }

  async function submitFeedback(input: PrivateFeedbackInput): Promise<string | null> {
    if (rating === null) return "Please choose a rating first.";
    const sessionId = await session.ensure();
    if (!sessionId) return "We couldn’t send your feedback right now. Please try again.";
    const result = await reviewApi.submitFeedback({ slug, sessionId, rating, ...input });
    if (!result.ok) return result.error;
    session.finish();
    setStep("sent");
    return null;
  }

  return (
    <div>
      {step === "rating" && (
        <Step>
          <div className="flex flex-col gap-2 text-center">
            <StepHeading as="h1" autoFocus={false}>
              How was your experience?
            </StepHeading>
            <p className="text-muted">Your feedback helps us improve.</p>
          </div>
          <StarRating value={rating} onChange={chooseRating} />
        </Step>
      )}

      {step === "liked" && (
        <Step>
          <div className="flex flex-col gap-2">
            <RatingBadge rating={rating} onChange={() => setStep("rating")} />
            <StepHeading id={likedHeadingId}>What did you like?</StepHeading>
          </div>
          <CategorySelector
            options={business.positiveCategories}
            selected={liked}
            onToggle={toggleLiked}
            labelledBy={likedHeadingId}
          />

          {showExtra ? (
            <div className="flex flex-col gap-2">
              <label htmlFor={extraId} className="text-sm font-semibold text-ink">
                Want to add something? <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id={extraId}
                value={customerInput}
                onChange={(e) => setCustomerInput(e.target.value)}
                maxLength={limits.customerInputMaxChars}
                rows={3}
                autoFocus
                placeholder="In your own words"
                className="w-full resize-none rounded-2xl bg-white p-4 text-ink ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowExtra(true)}
              className="-mt-2 self-start rounded-full py-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
            >
              + Want to add something?
            </button>
          )}

          <Button onClick={() => generate("first")} disabled={liked.length === 0} className="min-h-14">
            {liked.length === 0 ? "Pick at least one" : "Create my review"}
          </Button>
        </Step>
      )}

      {step === "generating" && (
        <Step>
          <ReviewGenerator
            error={generateError}
            onRetry={() => generate("first")}
            onWriteOwn={() => {
              setReview("");
              setWriteOwn(true);
              setStep("preview");
            }}
          />
        </Step>
      )}

      {step === "preview" && (
        <Step>
          <ReviewPreview
            review={review}
            remaining={writeOwn ? null : remaining}
            isRegenerating={busy === "regenerate"}
            isApproving={busy === "approve"}
            notice={previewNotice}
            startEditing={writeOwn && !review}
            onSave={saveEdit}
            onRegenerate={() => generate("regenerate")}
            onApprove={approve}
          />
        </Step>
      )}

      {step === "share" && (
        <Step>
          <div className="flex flex-col gap-2">
            <StepHeading>Ready to share your experience?</StepHeading>
            <p className="text-muted">It only takes a moment on Google.</p>
          </div>
          <figure className="relative rounded-3xl bg-white/80 p-5 pr-16 ring-1 ring-black/5">
            <blockquote className="font-display text-[1.05rem] leading-relaxed text-ink select-text">{review}</blockquote>
            <div className="absolute top-3 right-3">
              <CopyReviewButton text={review} />
            </div>
          </figure>
          <GoogleReviewButton url={business.googleReviewUrl} review={review} onClick={trackGoogleClick} />
          <Button variant="ghost" onClick={() => setStep("preview")}>
            Edit my review
          </Button>
        </Step>
      )}

      {step === "private" && (
        <Step>
          <PrivateFeedbackForm
            categories={business.negativeCategories}
            onSubmit={submitFeedback}
            onBack={() => setStep("rating")}
          />
        </Step>
      )}

      {step === "sent" && (
        <Step>
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span aria-hidden className="grid size-16 place-items-center rounded-full bg-brand text-on-brand">
              <svg viewBox="0 0 24 24" className="size-8">
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <StepHeading>Thank you for your feedback.</StepHeading>
            <p className="text-muted">Your feedback has been shared with the business.</p>
          </div>
          {business.offerGoogleReviewAfterPrivateFeedback && business.googleReviewUrl && (
            <div className="border-t border-dashed border-black/15 pt-5">
              <p className="mb-3 text-center text-sm text-muted">
                You’re also welcome to leave a public review.
              </p>
              <GoogleReviewButton url={business.googleReviewUrl} onClick={trackGoogleClick} label="Review on Google" />
            </div>
          )}
        </Step>
      )}
    </div>
  );
}

function RatingBadge({ rating, onChange }: { rating: number | null; onChange: () => void }) {
  if (!rating) return null;
  return (
    <button
      type="button"
      onClick={onChange}
      className="inline-flex items-center gap-2 self-start rounded-full bg-white/70 py-1.5 pr-3 pl-2.5 text-sm text-muted ring-1 ring-black/5 transition hover:text-ink"
    >
      <span aria-hidden className="tracking-[0.15em] text-brand">
        {"★".repeat(rating)}
      </span>
      <span>
        {rating} {rating === 1 ? "star" : "stars"} · <span className="underline underline-offset-2">Change</span>
      </span>
    </button>
  );
}
