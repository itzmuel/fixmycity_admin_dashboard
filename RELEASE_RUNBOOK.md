# FixMyCity Admin Dashboard Release Runbook

## 1) Go/No-Go Critical Gates

1. Access control
- All admin routes are wrapped by auth guard.
- Non-authenticated users are redirected to login.
- Non-allowlisted users are rejected and signed out.

2. Supabase environment
- `VITE_SUPABASE_URL` set.
- `VITE_SUPABASE_ANON_KEY` set.
- Admin user IDs exist in `public.admins` table.

3. Data policy enforcement
- Admin can read all issues.
- Admin can update status.
- Non-admin cannot update issue status.

## 2) Local Validation Commands

Run from project root.

```bash
npm run lint
npm run build
```

Optional run check:

```bash
npm run dev
```

## 3) Manual Verification Flow

1. Open login page.
2. Sign in with allowlisted admin account.
3. Verify dashboard list loads.
4. Open issue details.
5. Change status from Submitted -> In Progress -> Resolved.
6. Open Notifications Queue and verify new status_changed event appears.
7. Refresh and verify status persists.
8. Sign out.
9. Attempt login with non-admin account and verify denial.

## 4) Troubleshooting

If dashboard cannot load/update:

1. Confirm user is in `public.admins`.
2. Confirm Supabase RLS policies for admin read/update are active.
3. Verify env keys in `.env` and restart Vite.
4. Check browser console/network for 401/403 or network errors.

## 5) Release Checklist

1. Run `npm run lint`.
2. Run `npm run build`.
3. Set production environment variables in hosting platform.
4. Deploy to hosting target.
5. Verify production URL with admin smoke test.
6. Record commit SHA and deployment timestamp.
7. Verify Supabase Edge Functions `notification-dispatch` and `categorize-issue` are deployed.

## 6) Vercel Deployment (Recommended)

This repo includes `vercel.json` configured for Vite build output and SPA rewrites.

1. Push the repository to GitHub.
2. In Vercel, click **Add New Project** and import the repository.
3. Confirm project settings:
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
4. Add environment variables in Vercel Project Settings -> Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Optional: `VITE_ISSUE_PHOTO_BUCKET`
5. Deploy the project.
6. Save the production URL in release notes.

## 7) Production URL Smoke Test

Run this against the live URL (not localhost):

1. Open `https://YOUR_DOMAIN/login`.
2. Sign in with allowlisted admin account.
3. Verify redirect to `/dashboard` and report list loads.
4. Open an issue details page and update status.
5. Open `https://YOUR_DOMAIN/notifications` and verify queue page loads.
6. Refresh and verify status persisted.
7. Open `https://YOUR_DOMAIN/dashboard` while signed out and verify redirect to `/login`.
8. Open `https://YOUR_DOMAIN/issues/KNOWN_ID` directly and verify route loads (rewrite works).
9. Attempt sign-in with non-admin user and verify access denial.

## 8) Alternative Hosting Targets

If you choose another host:

1. Netlify: set build command `npm run build`, publish directory `dist`, and add SPA redirect to `index.html`.
2. Firebase Hosting: deploy `dist` with rewrite rule to `index.html`.

## 9) Current Production Deployment

1. Platform: Vercel
2. Alias URL: `https://fixmycityadmindashboard.vercel.app`
3. Deployment date: 2026-03-18
