-- =============================================================================
-- AI QR Review & Customer Feedback System — initial schema
--
-- Security model
--   * Customers never access these tables directly. Every customer write goes
--     through a validated Next.js API route that uses the service-role key
--     (server-side only). The `anon` role therefore gets NO privileges.
--   * Admins sign in with Supabase Auth. They can read data only for businesses
--     they are linked to in `admin_users`, and may only update the
--     `feedback_status` and `admin_notes` columns of `review_sessions`.
--   * Row Level Security is enabled on every table.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- businesses
-- -----------------------------------------------------------------------------
create table public.businesses (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 120),
  slug              text not null unique
                      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  -- Free-form on purpose: any industry string is allowed ("cafe", "gym", ...).
  category          text not null check (char_length(category) between 1 and 80),
  logo_url          text,
  google_review_url text,
  primary_color     text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color   text check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- review_sessions — one row per customer visit (QR scan)
-- -----------------------------------------------------------------------------
create table public.review_sessions (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses (id) on delete cascade,
  rating              integer check (rating between 1 and 5),
  selected_categories text[] not null default '{}'
                        check (cardinality(selected_categories) <= 20),
  -- Positive flow: optional "want to add something?" text.
  -- Private flow: the customer's feedback text.
  customer_input      text check (char_length(customer_input) <= 4000),
  ai_generated_review text check (char_length(ai_generated_review) <= 2000),
  final_review        text check (char_length(final_review) <= 2000),
  status              text not null default 'started' check (status in (
                        'started', 'rating_selected', 'categories_selected',
                        'ai_generated', 'edited', 'approved', 'google_clicked',
                        'private_feedback_submitted', 'completed')),
  -- Abuse protection: number of AI generations used by this session.
  generation_count    integer not null default 0 check (generation_count >= 0),
  -- Admin workflow for private feedback.
  feedback_status     text check (feedback_status in ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes         text check (char_length(admin_notes) <= 4000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index review_sessions_business_created_idx
  on public.review_sessions (business_id, created_at desc);
create index review_sessions_business_status_idx
  on public.review_sessions (business_id, status);
create index review_sessions_private_feedback_idx
  on public.review_sessions (business_id, feedback_status, created_at desc)
  where status = 'private_feedback_submitted';

-- -----------------------------------------------------------------------------
-- review_events — append-only funnel events
-- -----------------------------------------------------------------------------
create table public.review_events (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  session_id  uuid not null references public.review_sessions (id) on delete cascade,
  event_type  text not null check (event_type in (
                'qr_scan', 'rating_selected', 'categories_selected', 'ai_requested',
                'ai_generated', 'review_edited', 'review_approved', 'google_clicked',
                'private_feedback_submitted')),
  created_at  timestamptz not null default now()
);

create index review_events_business_type_created_idx
  on public.review_events (business_id, event_type, created_at desc);
create index review_events_session_idx on public.review_events (session_id);

-- These events may only happen once per session, so metrics can't be inflated
-- by repeated clicks / double submits.
create unique index review_events_once_per_session_idx
  on public.review_events (session_id, event_type)
  where event_type in ('qr_scan', 'google_clicked', 'private_feedback_submitted');

-- -----------------------------------------------------------------------------
-- admin_users — which Supabase Auth users may administer which business
-- -----------------------------------------------------------------------------
create table public.admin_users (
  user_id     uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, business_id)
);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger review_sessions_updated_at before update on public.review_sessions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper: is the signed-in user an admin of the given business?
-- -----------------------------------------------------------------------------
create or replace function public.is_business_admin(p_business_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_users a
    where a.business_id = p_business_id
      and a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_business_admin(uuid) from public, anon;
grant execute on function public.is_business_admin(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.businesses      enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_events   enable row level security;
alter table public.admin_users     enable row level security;

-- Defence in depth: strip the default Supabase grants, then add back only what
-- is needed. (service_role bypasses RLS and keeps its own grants.)
revoke all on public.businesses, public.review_sessions, public.review_events, public.admin_users
  from anon, authenticated;

grant select on public.businesses, public.review_sessions, public.review_events, public.admin_users
  to authenticated;
-- Admins may only change the feedback workflow columns.
grant update (feedback_status, admin_notes) on public.review_sessions to authenticated;

create policy "Admins read their business"
  on public.businesses for select to authenticated
  using ((select public.is_business_admin(id)));

create policy "Admins read their sessions"
  on public.review_sessions for select to authenticated
  using ((select public.is_business_admin(business_id)));

create policy "Admins update private feedback workflow"
  on public.review_sessions for update to authenticated
  using ((select public.is_business_admin(business_id)) and status = 'private_feedback_submitted')
  with check ((select public.is_business_admin(business_id)) and status = 'private_feedback_submitted');

create policy "Admins read their events"
  on public.review_events for select to authenticated
  using ((select public.is_business_admin(business_id)));

create policy "Users read their own admin membership"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- claim_generation: atomically reserve one AI generation for a session.
-- Returns the new generation_count, or NULL when the limit is reached or the
-- session is already finished. Only callable with the service-role key.
-- -----------------------------------------------------------------------------
create or replace function public.claim_generation(p_session_id uuid, p_max integer)
returns integer
language sql security invoker set search_path = '' as $$
  update public.review_sessions
     set generation_count = generation_count + 1
   where id = p_session_id
     and generation_count < p_max
     and status not in ('google_clicked', 'private_feedback_submitted', 'completed')
  returning generation_count;
$$;

revoke all on function public.claim_generation(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_generation(uuid, integer) to service_role;

-- -----------------------------------------------------------------------------
-- Admin metrics & analytics. SECURITY INVOKER => RLS applies, so an admin can
-- only ever aggregate rows of businesses they administer.
-- -----------------------------------------------------------------------------
create or replace function public.review_metrics(p_business_id uuid, p_since timestamptz default null)
returns json
language sql stable security invoker set search_path = '' as $$
  with s as (
    select * from public.review_sessions
    where business_id = p_business_id and (p_since is null or created_at >= p_since)
  ), e as (
    select event_type from public.review_events
    where business_id = p_business_id and (p_since is null or created_at >= p_since)
  )
  select json_build_object(
    'qr_scans',              (select count(*) from e where event_type = 'qr_scan'),
    'google_review_clicks',  (select count(*) from e where event_type = 'google_clicked'),
    'total_sessions',        (select count(*) from s),
    'private_feedback',      (select count(*) from s where status = 'private_feedback_submitted'),
    'positive_sessions',     (select count(*) from s where rating >= 4),
    'ai_generated_reviews',  (select count(*) from s where ai_generated_review is not null),
    'completed_sessions',    (select count(*) from s where status in
                               ('google_clicked', 'private_feedback_submitted', 'completed'))
  );
$$;

create or replace function public.review_analytics(p_business_id uuid, p_since timestamptz default null)
returns json
language sql stable security invoker set search_path = '' as $$
  with s as (
    select rating, selected_categories from public.review_sessions
    where business_id = p_business_id
      and rating is not null
      and (p_since is null or created_at >= p_since)
  )
  select json_build_object(
    'ratings', coalesce((
      select json_agg(json_build_object('rating', r.rating, 'count', r.cnt) order by r.rating)
      from (select rating, count(*) as cnt from s group by rating) r
    ), '[]'::json),
    'liked', coalesce((
      select json_agg(json_build_object('category', c.category, 'count', c.cnt) order by c.cnt desc, c.category)
      from (select unnest(selected_categories) as category, count(*) as cnt
            from s where rating >= 4 group by 1) c
    ), '[]'::json),
    'improve', coalesce((
      select json_agg(json_build_object('category', c.category, 'count', c.cnt) order by c.cnt desc, c.category)
      from (select unnest(selected_categories) as category, count(*) as cnt
            from s where rating <= 3 group by 1) c
    ), '[]'::json)
  );
$$;

revoke all on function public.review_metrics(uuid, timestamptz) from public, anon;
revoke all on function public.review_analytics(uuid, timestamptz) from public, anon;
grant execute on function public.review_metrics(uuid, timestamptz) to authenticated;
grant execute on function public.review_analytics(uuid, timestamptz) to authenticated;
