export const SESSION_STATUSES = [
  "started",
  "rating_selected",
  "categories_selected",
  "ai_generated",
  "edited",
  "approved",
  "google_clicked",
  "private_feedback_submitted",
  "completed",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** Once a session reaches one of these, the customer can no longer change it. */
export const TERMINAL_STATUSES: readonly SessionStatus[] = [
  "google_clicked",
  "private_feedback_submitted",
  "completed",
];

export const EVENT_TYPES = [
  "qr_scan",
  "rating_selected",
  "categories_selected",
  "ai_requested",
  "ai_generated",
  "review_edited",
  "review_approved",
  "google_clicked",
  "private_feedback_submitted",
] as const;
export type ReviewEventType = (typeof EVENT_TYPES)[number];

export type Rating = 1 | 2 | 3 | 4 | 5;

export function isPositiveRating(rating: number): boolean {
  return rating >= 4;
}

/** Standard JSON error body returned by every API route. */
export interface ApiErrorBody {
  error: string;
  code: string;
}

export interface GenerateReviewResponse {
  review: string;
  /** How many more generations (regenerations) this session may request. */
  remaining: number;
}
