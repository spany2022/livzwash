-- =============================================================================
-- Weekly AI summaries
--   * weekly_summaries: one saved summary per business per week (Mon–Sun).
--   * review_period_stats(): exact numbers for any time window.
-- Run this AFTER 0001_init.sql (Supabase → SQL Editor → paste → Run).
-- =============================================================================

create table public.weekly_summaries (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  -- Monday of the summarised week, in the business's time zone.
  week_start       date not null check (extract(isodow from week_start) = 1),
  -- Snapshot of the exact numbers the summary was written from.
  stats            jsonb not null,
  -- AI output: { headline, wentWell[], toImprove[], suggestions[] }.
  summary          jsonb not null,
  model            text,
  generation_count integer not null default 1 check (generation_count >= 1),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (business_id, week_start)
);

create index weekly_summaries_business_week_idx
  on public.weekly_summaries (business_id, week_start desc);

create trigger weekly_summaries_updated_at before update on public.weekly_summaries
  for each row execute function public.set_updated_at();

alter table public.weekly_summaries enable row level security;
revoke all on public.weekly_summaries from anon, authenticated;
grant select, insert, update on public.weekly_summaries to authenticated;

create policy "Admins read their summaries"
  on public.weekly_summaries for select to authenticated
  using ((select public.is_business_admin(business_id)));

create policy "Admins create their summaries"
  on public.weekly_summaries for insert to authenticated
  with check ((select public.is_business_admin(business_id)));

create policy "Admins update their summaries"
  on public.weekly_summaries for update to authenticated
  using ((select public.is_business_admin(business_id)))
  with check ((select public.is_business_admin(business_id)));

-- -----------------------------------------------------------------------------
-- Exact numbers for [p_from, p_to). SECURITY INVOKER → RLS applies for admins.
-- -----------------------------------------------------------------------------
create or replace function public.review_period_stats(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns json
language sql stable security invoker set search_path = '' as $$
  with s as (
    select rating, selected_categories, status, ai_generated_review
    from public.review_sessions
    where business_id = p_business_id and created_at >= p_from and created_at < p_to
  ), e as (
    select event_type from public.review_events
    where business_id = p_business_id and created_at >= p_from and created_at < p_to
  )
  select json_build_object(
    'qr_scans',             (select count(*) from e where event_type = 'qr_scan'),
    'google_review_clicks', (select count(*) from e where event_type = 'google_clicked'),
    'total_sessions',       (select count(*) from s),
    'rated_sessions',       (select count(*) from s where rating is not null),
    'average_rating',       (select round(avg(rating)::numeric, 1) from s where rating is not null),
    'positive_sessions',    (select count(*) from s where rating >= 4),
    'private_feedback',     (select count(*) from s where status = 'private_feedback_submitted'),
    'ai_generated_reviews', (select count(*) from s where ai_generated_review is not null),
    'completed_sessions',   (select count(*) from s where status in
                              ('google_clicked', 'private_feedback_submitted', 'completed')),
    'ratings', coalesce((
      select json_agg(json_build_object('rating', r.rating, 'count', r.cnt) order by r.rating)
      from (select rating, count(*) as cnt from s where rating is not null group by rating) r
    ), '[]'::json),
    'liked', coalesce((
      select json_agg(json_build_object('category', c.category, 'count', c.cnt) order by c.cnt desc, c.category)
      from (select unnest(selected_categories) as category, count(*) as cnt
            from s where rating >= 4 group by 1) c
    ), '[]'::json),
    'improve', coalesce((
      select json_agg(json_build_object('category', c.category, 'count', c.cnt) order by c.cnt desc, c.category)
      from (select unnest(selected_categories) as category, count(*) as cnt
            from s where rating <= 3 and status = 'private_feedback_submitted' group by 1) c
    ), '[]'::json)
  );
$$;

revoke all on function public.review_period_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.review_period_stats(uuid, timestamptz, timestamptz) to authenticated, service_role;
