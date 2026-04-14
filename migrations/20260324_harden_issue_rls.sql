-- Harden issue visibility so citizens only see their own reports.
-- This migration is intentionally opinionated: it recreates all RLS policies on public.issues.

begin;

alter table public.issues enable row level security;
alter table public.issues force row level security;

-- Ensure reporter_id is always tied to the authenticated user for inserts.
alter table public.issues alter column reporter_id set default auth.uid();

-- Remove any existing issues policies (including legacy permissive ones with unknown names).
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'issues'
  loop
    execute format('drop policy if exists %I on public.issues', p.policyname);
  end loop;
end $$;

-- Citizens can create only their own rows.
create policy "citizens insert own"
on public.issues
for insert
to authenticated
with check (reporter_id = auth.uid());

-- Citizens can read only their own rows.
create policy "citizens view own"
on public.issues
for select
to authenticated
using (reporter_id = auth.uid());

-- Admins can read all rows.
create policy "admins can read all issues"
on public.issues
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
  )
);

-- Admins can update rows.
create policy "admins can update issues"
on public.issues
for update
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
  )
);

-- Home page community data (global counts + recent feed) while keeping table RLS strict.
create or replace function public.get_community_issue_stats()
returns table (
  submitted_count bigint,
  in_progress_count bigint,
  resolved_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    count(*) filter (where status = 'submitted'::public.issue_status) as submitted_count,
    count(*) filter (where status = 'in_progress'::public.issue_status) as in_progress_count,
    count(*) filter (where status = 'resolved'::public.issue_status) as resolved_count
  from public.issues;
$$;

grant execute on function public.get_community_issue_stats() to authenticated;

create or replace function public.get_community_recent_reports(limit_count integer default 3)
returns table (
  id text,
  category text,
  description text,
  status public.issue_status,
  address text,
  latitude double precision,
  longitude double precision,
  photo_url text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    i.category,
    i.description,
    i.status,
    i.address,
    i.latitude,
    i.longitude,
    i.photo_url,
    i.created_at
  from public.issues i
  order by i.created_at desc
  limit greatest(coalesce(limit_count, 3), 0);
$$;

grant execute on function public.get_community_recent_reports(integer) to authenticated;

commit;
