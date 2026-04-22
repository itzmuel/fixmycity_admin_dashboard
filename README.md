# FixMyCity Admin Dashboard

Web admin dashboard for reviewing citizen issue reports, inspecting report details, and updating issue status in Supabase.

## Overview

This app is the admin-facing companion to the FixMyCity reporting platform. It provides:

- Email/password authentication with Supabase Auth
- Admin allowlist enforcement through the `public.admins` table
- Dashboard view of submitted issues with search, status filters, and pagination
- Live issue sync with Supabase realtime subscriptions (insert/update/delete)
- Duplicate-risk flagging for reports within ~20 meters
- SLA visibility (`on time`, `overdue`, `resolved in SLA`)
- Heatmap mode on map view to reveal issue hotspots
- Audit trail writes for admin status changes (`public.issue_logs`)
- Notification event queue for Edge Function email/push workers (`public.notification_events`)
- Issue detail view with photo preview, map preview, and status updates
- Support for issue photos stored as either full URLs or Supabase Storage object paths

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Supabase

## Routes

- `/login` - Admin sign-in
- `/signup` - Admin account creation
- `/email-confirmed` - Post-confirmation landing page
- `/dashboard` - Protected issue list view
- `/notifications` - Protected notification queue monitor
- `/issues/:id` - Protected issue detail view

All routes under `/dashboard`, `/notifications`, and `/issues/:id` require an authenticated allowlisted admin.

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ISSUE_PHOTO_BUCKET=issue-photos
VITE_CATEGORY_FUNCTION_NAME=categorize-issue
```

Notes:

- `VITE_SUPABASE_URL` is required.
- `VITE_SUPABASE_ANON_KEY` is required.
- `VITE_ISSUE_PHOTO_BUCKET` is optional. The app defaults to `issue-photos` and also recognizes the legacy `issue-photo` bucket name when resolving stored image paths.
- `VITE_CATEGORY_FUNCTION_NAME` is optional. Defaults to `categorize-issue` and is used for AI category suggestions in Issue Details.

## Admin Access Model

Authentication alone is not enough to access the dashboard. After a user signs up or signs in, the app checks whether that user's ID exists in `public.admins`.

To grant access:

1. Create the user through `/signup` or directly in Supabase Auth.
2. Get the user's `auth.users.id`.
3. Insert that ID into `public.admins.user_id`.

If a signed-in user is not allowlisted, the app signs them out and blocks access.

## Local Development

Install dependencies:

```bash
npm install
```

Start the Vite dev server:

```bash
npm run dev
```

Open the local URL shown by Vite, then sign in with an allowlisted admin account.

## Available Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Issue Data Expectations

The dashboard reads from the `issues` table and expects these fields:

- `id`
- `category`
- `description`
- `status`
- `created_at`
- `address`
- `latitude`
- `longitude`
- `photo_url`

Supported status values:

- `submitted`
- `in_progress`
- `resolved`

The dashboard can:

- List issues ordered by newest first
- Search by ID, category, description, and address
- Filter by status
- View issue details
- Update issue status

## Photo Handling

Issue photos are resolved in a few formats:

- Full absolute URLs
- Supabase public storage URLs
- Stored object paths relative to the configured bucket
- Legacy paths prefixed with `issue-photo/`

By default, the app generates public URLs from the `issue-photos` bucket when needed.

## Database and Security Notes

This repository includes Supabase SQL migrations in the `migrations/` directory. These cover items such as:

- Enabling row-level security
- Fresh-start schema setup
- Hardening issue access policies
- Realtime/SLA/audit/notification support (`20260421_realtime_sla_audit_notifications.sql`)
- Storage upload validation hardening (`20260421_storage_upload_validation.sql`)

For the admin dashboard to work correctly, your Supabase policies must allow:

- Allowlisted admins to read issues
- Allowlisted admins to update issue status
- Non-admin users to be denied those actions

## Recommended Validation

Before release, run:

```bash
npm run lint
npm run build
```

Manual smoke test:

1. Visit `/login` while signed out.
2. Sign in with an allowlisted admin account.
3. Confirm the dashboard loads issue data.
4. Open an issue detail page.
5. Change status from `submitted` to `in_progress` or `resolved`.
6. Refresh and verify the updated status persists.
7. Sign out and confirm protected routes redirect back to `/login`.

Extended test checklist:

- See `TEST_CASES.md` for realtime, duplicate detection, SLA, heatmap, and audit/notification test scenarios.

## Edge Function Workers

- Notification delivery worker scaffold is provided in `supabase/functions/notification-dispatch/`.
- It processes `public.notification_events` and can dispatch email (Resend) or push (FCM).
- AI category suggestion worker scaffold is provided in `supabase/functions/categorize-issue/`.
- Issue Details category suggestion calls this function (or falls back to local heuristic classification).

## Mobile Upload Sync

- This repository contains shared upload validation primitives in `src/services/uploadValidation.ts`.
- Integration notes for wiring the same rules in the mobile app are in `MOBILE_INTEGRATION.md`.

## Deployment

This project includes `vercel.json` for Vercel deployment with SPA route rewrites.

Deployment checklist:

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Optional: `VITE_ISSUE_PHOTO_BUCKET`
4. Deploy.
5. Verify direct navigation to `/dashboard` and `/issues/:id` works in production.

For a fuller release checklist, see `RELEASE_RUNBOOK.md`.
