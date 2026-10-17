-- Link an existing Supabase Auth user to BOTH Livzwash branches as an admin.
-- 1. Create the user first: Supabase Dashboard → Authentication → Users → Add user.
-- 2. Replace the admin email below, then run this in the SQL Editor.
--    (Run it again with another email to add more admins.)

insert into public.businesses (name, slug, category)
values
  ('Livzwash Chandrasekharpur', 'livzwash-chandrasekharpur', 'laundry-and-dry-cleaning'),   -- must match src/config/business.ts
  ('Livzwash Bomikhal',         'livzwash-bomikhal',         'laundry-and-dry-cleaning')
on conflict (slug) do nothing;

insert into public.admin_users (user_id, business_id)
select u.id, b.id
from auth.users u
join public.businesses b on b.slug in ('livzwash-chandrasekharpur', 'livzwash-bomikhal')   -- your slugs
where u.email = 'sandesh2002pany@gmail.com'                                                  -- the admin's email
on conflict do nothing;
