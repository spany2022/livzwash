/**
 * Hand-written Supabase types matching supabase/migrations/0001_init.sql.
 * (Can be regenerated with `npx supabase gen types typescript` if preferred.)
 */
import type { ReviewEventType, SessionStatus } from "./review";
import type { FeedbackStatus } from "./feedback";

type Timestamp = string;

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string;
          logo_url: string | null;
          google_review_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          category: string;
          logo_url?: string | null;
          google_review_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
        Relationships: [];
      };
      review_sessions: {
        Row: {
          id: string;
          business_id: string;
          rating: number | null;
          selected_categories: string[];
          customer_input: string | null;
          ai_generated_review: string | null;
          final_review: string | null;
          status: SessionStatus;
          generation_count: number;
          feedback_status: FeedbackStatus | null;
          admin_notes: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          business_id: string;
          rating?: number | null;
          selected_categories?: string[];
          customer_input?: string | null;
          ai_generated_review?: string | null;
          final_review?: string | null;
          status?: SessionStatus;
          feedback_status?: FeedbackStatus | null;
          admin_notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["review_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "review_sessions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      review_events: {
        Row: {
          id: string;
          business_id: string;
          session_id: string;
          event_type: ReviewEventType;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          business_id: string;
          session_id: string;
          event_type: ReviewEventType;
        };
        Update: Partial<Database["public"]["Tables"]["review_events"]["Insert"]>;
        Relationships: [];
      };
      weekly_summaries: {
        Row: {
          id: string;
          business_id: string;
          week_start: string;
          stats: unknown;
          summary: unknown;
          model: string | null;
          generation_count: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          business_id: string;
          week_start: string;
          stats: unknown;
          summary: unknown;
          model?: string | null;
          generation_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["weekly_summaries"]["Insert"]>;
        Relationships: [];
      };
      admin_users: {
        Row: { user_id: string; business_id: string; created_at: Timestamp };
        Insert: { user_id: string; business_id: string };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_generation: {
        Args: { p_session_id: string; p_max: number };
        Returns: number | null;
      };
      review_metrics: {
        Args: { p_business_id: string; p_since?: string | null };
        Returns: unknown;
      };
      review_analytics: {
        Args: { p_business_id: string; p_since?: string | null };
        Returns: unknown;
      };
      review_period_stats: {
        Args: { p_business_id: string; p_from: string; p_to: string };
        Returns: unknown;
      };
      is_business_admin: {
        Args: { p_business_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
