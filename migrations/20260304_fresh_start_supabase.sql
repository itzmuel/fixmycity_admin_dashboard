-- Fresh start Supabase setup for FixMyCity admin + citizen issue reporting
-- Safe to run multiple times (idempotent where possible).

begin;

-- 1) status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'issue_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.issue_status AS ENUM ('submitted', 'in_progress', 'resolved');
  END IF;
END $$;

-- 2) tables
CREATE TABLE IF NOT EXISTS public.issues (
  id text PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  status public.issue_status NOT NULL DEFAULT 'submitted',
  address text,
  latitude double precision,
  longitude double precision,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_set_issues_updated_at'
  ) THEN
    CREATE TRIGGER trg_set_issues_updated_at
    BEFORE UPDATE ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 4) indexes
CREATE INDEX IF NOT EXISTS idx_issues_reporter_id ON public.issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON public.issues(created_at DESC);

-- 5) enable RLS
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 6) admins policies (non-recursive)
DROP POLICY IF EXISTS "admins can read admins" ON public.admins;
DROP POLICY IF EXISTS "admins can read own row" ON public.admins;

CREATE POLICY "admins can read own row"
ON public.admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 7) issues policies
DROP POLICY IF EXISTS "citizens insert own" ON public.issues;
CREATE POLICY "citizens insert own"
ON public.issues
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "citizens view own" ON public.issues;
CREATE POLICY "citizens view own"
ON public.issues
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all issues" ON public.issues;
CREATE POLICY "Admins can read all issues"
ON public.issues
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins
    WHERE admins.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can update issues" ON public.issues;
CREATE POLICY "Admins can update issues"
ON public.issues
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins
    WHERE admins.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admins
    WHERE admins.user_id = auth.uid()
  )
);

-- 8) optional bootstrap: if admins is empty, make earliest auth user an admin
INSERT INTO public.admins(user_id)
SELECT u.id
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.admins)
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- 9) storage bucket + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "issue_photos_insert_own" ON storage.objects;
CREATE POLICY "issue_photos_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'issue-photos'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "issue_photos_update_own" ON storage.objects;
CREATE POLICY "issue_photos_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'issue-photos'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'issue-photos'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "issue_photos_delete_own" ON storage.objects;
CREATE POLICY "issue_photos_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'issue-photos'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

commit;
