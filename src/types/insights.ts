/** Exact numbers for one period, straight from the database. */
export interface PeriodStats {
  qr_scans: number;
  google_review_clicks: number;
  total_sessions: number;
  rated_sessions: number;
  /** Average of the stars chosen, one decimal; null when nobody rated. */
  average_rating: number | null;
  positive_sessions: number;
  private_feedback: number;
  ai_generated_reviews: number;
  completed_sessions: number;
  ratings: { rating: number; count: number }[];
  liked: { category: string; count: number }[];
  improve: { category: string; count: number }[];
}

/** What is stored alongside a summary: this week plus the week before, for comparison. */
export interface WeeklyStatsSnapshot {
  current: PeriodStats;
  previous: PeriodStats;
}

/** The AI's written part. Every item is a short plain-language sentence. */
export interface WeeklySummaryContent {
  headline: string;
  wentWell: string[];
  toImprove: string[];
  suggestions: string[];
}

export interface StoredWeeklySummary {
  weekStart: string;
  stats: WeeklyStatsSnapshot;
  summary: WeeklySummaryContent;
  generationCount: number;
  updatedAt: string;
}
