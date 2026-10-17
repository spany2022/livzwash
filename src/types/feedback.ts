export const FEEDBACK_STATUSES = ["new", "in_progress", "resolved", "closed"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export interface PrivateFeedback {
  id: string;
  rating: number | null;
  categories: string[];
  feedback: string;
  status: FeedbackStatus;
  adminNotes: string | null;
  createdAt: string;
}

export interface ReviewMetrics {
  qr_scans: number;
  google_review_clicks: number;
  total_sessions: number;
  private_feedback: number;
  positive_sessions: number;
  ai_generated_reviews: number;
  completed_sessions: number;
}

export interface ReviewAnalytics {
  ratings: { rating: number; count: number }[];
  liked: { category: string; count: number }[];
  improve: { category: string; count: number }[];
}
