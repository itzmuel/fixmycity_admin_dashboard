-- 1) status enum
do $$ begin
	create type public.issue_status as enum ('submitted', 'in_progress', 'resolved');
exception
	when duplicate_object then null;
end $$;

-- 2) issues table
create table if not exists public.issues (
	id text primary key,
	reporter_id uuid not null references auth.users(id) on delete cascade,
	category text not null,
	description text not null,
	status public.issue_status not null default 'submitted',
	address text,
	latitude double precision,
	longitude double precision,
	photo_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- 3) updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
	new.updated_at = now();
	return new;
end;
$$ language plpgsql;

-- 4) create trigger only if missing (NO DROP = less scary)
do $$ begin
	if not exists (
		select 1 from pg_trigger where tgname = 'trg_set_updated_at'
	) then
		create trigger trg_set_updated_at
		before update on public.issues
		for each row execute function public.set_updated_at();
	end if;
end $$;

-- 5) admins table (allowlist)
create table if not exists public.admins (
	user_id uuid primary key references auth.users(id) on delete cascade,
	created_at timestamptz not null default now()
);

-- 6) indexes
create index if not exists idx_issues_reporter_id on public.issues(reporter_id);
create index if not exists idx_issues_status on public.issues(status);
create index if not exists idx_issues_created_at on public.issues(created_at desc);

alter table public.issues enable row level security;
alter table public.admins enable row level security;

-- Admins: each user can read only their own allowlist row (non-recursive)
drop policy if exists "admins can read admins" on public.admins;
drop policy if exists "admins can read own row" on public.admins;
create policy "admins can read own row"
on public.admins
for select
to authenticated
using (user_id = auth.uid());

-- Issues: citizens can insert their own reports
drop policy if exists "citizens insert own" on public.issues;
create policy "citizens insert own"
on public.issues
for insert
to authenticated
with check (reporter_id = auth.uid());

-- Issues: citizens can view only their own reports
drop policy if exists "citizens view own" on public.issues;
create policy "citizens view own"
on public.issues
for select
to authenticated
using (reporter_id = auth.uid());

drop policy if exists "Admins can read all issues" on public.issues;
create policy "Admins can read all issues"
on public.issues
for select
using (
	exists (
		select 1 from public.admins
		where admins.user_id = auth.uid()
	)
);

drop policy if exists "Admins can update issues" on public.issues;
create policy "Admins can update issues"
on public.issues
for update
using (
	exists (
		select 1 from public.admins
		where admins.user_id = auth.uid()
	)
);

insert into public.admins(user_id)
values ('14ca06dd-6504-4e1d-81f3-54badb711025')
on conflict (user_id) do nothing;

-- 1) Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('issue-photos', 'issue-photos', true)
on conflict (id) do update set public = excluded.public;

-- 2) Allow signed-in users (including anonymous sign-in) to upload only to their own folder
drop policy if exists "issue_photos_insert_own" on storage.objects;
create policy "issue_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'issue-photos'
	and (storage.foldername(name))[1] = 'users'
	and (storage.foldername(name))[2] = auth.uid()::text
);

-- 3) Allow signed-in users to update/delete only their own files (optional but recommended)
drop policy if exists "issue_photos_update_own" on storage.objects;
create policy "issue_photos_update_own"
on storage.objects
for update
to authenticated
using (
	bucket_id = 'issue-photos'
	and (storage.foldername(name))[1] = 'users'
	and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
	bucket_id = 'issue-photos'
	and (storage.foldername(name))[1] = 'users'
	and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "issue_photos_delete_own" on storage.objects;
create policy "issue_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'issue-photos'
	and (storage.foldername(name))[1] = 'users'
	and (storage.foldername(name))[2] = auth.uid()::text
);
